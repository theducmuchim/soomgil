import type {
  AreaRisk,
  DistrictId,
  IndicatorId,
  IndicatorReading,
  RiskLevel,
  RiskSnapshot,
  Season,
  WeatherWarning,
} from '@/types';
import { DISTRICTS } from '@/data/districts';
import { DATA_MODE, ALLOW_SEASON_OVERRIDE } from '@/lib/env';
import { getScenario, type Scenario } from '@/mocks/scenarios';
import {
  getActiveIndicators,
  getAvailableIndicators,
  getSeasonWeights,
  resolveSeason,
} from '@/lib/risk/season';
import { averageBreakdown, dominantIndicator, levelFromScore, scoreArea } from '@/lib/risk/score';
import { applyWarningFloor, apparentTemp } from '@/lib/risk/apparent-temp';
import { makeReading } from '@/lib/normalize/reading';
import {
  parseIndexValue,
  parseVilageFcst,
  parseWarnings,
  type ForecastValues,
} from '@/lib/normalize/kma';
import { parseRealtimeByDistrict, type AirValues } from '@/lib/normalize/airkorea';
import { kstParts } from '@/lib/utils/time';
import { windLabel } from '@/lib/utils/wind';
import { fetchPollen, type PollenKind } from './kma-pollen';
import { fetchStagnation } from './kma-stagnation';
import { fetchVilageFcst } from './kma-forecast';
import { fetchWarnings } from './kma-warning';
import { fetchAirRealtime } from './airkorea-realtime';

export { fetchAirForecast } from './airkorea-forecast';

/** 꽃가루 지표 ↔ API 종류 대응 */
const POLLEN_KIND: Partial<Record<IndicatorId, PollenKind>> = {
  pinePollen: 'pine',
  oakPollen: 'oak',
  weedPollen: 'weed',
};

export interface SnapshotOptions {
  now?: Date;
  /** 시연용 계절 강제 (mock 모드에서만 반영) */
  seasonOverride?: Season | null;
}

/**
 * 모든 화면이 소비하는 최상위 진입점.
 *
 * 공공데이터 4종을 병렬로 받아 정규화하고 위험 점수까지 계산해
 * 완성된 RiskSnapshot 하나로 돌려준다.
 * 화면 컴포넌트는 이 함수 하나만 알면 되고, mock인지 live인지는 모른다.
 */
export async function getRiskSnapshot(options: SnapshotOptions = {}): Promise<RiskSnapshot> {
  const now = options.now ?? new Date();
  const season = resolveSeason(now, ALLOW_SEASON_OVERRIDE ? options.seasonOverride : null);
  const scenario = getScenario(season);

  // 기준 시각 — mock이면 시나리오에 적힌 그 계절의 대표 일시를 쓴다.
  // 그래야 "겨울을 시연 중인데 8월 기준으로 꽃가루 서비스 기간을 판정"하는 어긋남이 없다.
  const baseTime = DATA_MODE === 'mock' ? scenario.baseTime : now.toISOString();
  const referenceDate = new Date(baseTime);
  const { month } = kstParts(referenceDate);

  // 화면 표시 우선순위 — 이번 계절의 핵심 지표
  const activeIds = getActiveIndicators(season, month);
  // 실제로 담을 지표 — 이번 달에 받을 수 있는 것 전부 (추가 호출 없음)
  const readingIds = getAvailableIndicators(month);
  const weights = getSeasonWeights(season, month);

  // ── 시 단위 호출 (자치구 수와 무관하게 1회씩) ──
  const [airRes, warnRes] = await Promise.all([
    fetchAirRealtime(scenario),
    fetchWarnings(scenario, referenceDate),
  ]);
  const airByDistrict = parseRealtimeByDistrict(airRes);
  const warnings = parseWarnings(warnRes);

  // ── 단기예보: 격자가 겹치는 구는 한 번만 부른다 ──
  const forecastByDistrict = await fetchForecastsDeduped(scenario, referenceDate);

  // ── 자치구별 호출 (꽃가루 · 대기정체) ──
  const pollenIds = readingIds.filter((id) => id in POLLEN_KIND);

  const districts: AreaRisk[] = await Promise.all(
    DISTRICTS.map(async (district) => {
      const [stagnationRes, ...pollenResList] = await Promise.all([
        fetchStagnation(scenario, district.areaNo),
        ...pollenIds.map((id) =>
          fetchPollen(scenario, district.areaNo, POLLEN_KIND[id] as PollenKind),
        ),
      ]);

      const stagnationValue = parseIndexValue(stagnationRes) ?? 0;
      const stagnationReading = makeReading('stagnation', stagnationValue, baseTime, month);

      const pollenValues = new Map<IndicatorId, number | null>();
      pollenIds.forEach((id, i) => pollenValues.set(id, parseIndexValue(pollenResList[i])));

      const air = airByDistrict[district.id];
      const forecast = forecastByDistrict[district.id];

      const readings = readingIds.map((id) =>
        buildReading({ id, baseTime, month, air, forecast, warnings, pollenValues }),
      );

      const breakdown = scoreArea(readings, weights, stagnationReading.normalized);
      const level: RiskLevel = levelFromScore(breakdown.score);

      return {
        areaId: district.id,
        areaName: district.name,
        score: breakdown.score,
        level,
        breakdown,
        dominantIndicator: dominantIndicator(breakdown),
        readings: [...readings, stagnationReading],
        wind: {
          degree: forecast?.windDeg ?? 0,
          speed: forecast?.windMs ?? 0,
          label: windLabel(forecast?.windDeg ?? 0),
        },
      } satisfies AreaRisk;
    }),
  );

  // 시 전역 대기정체 — 자치구 평균
  const stagnationCity = average(
    districts.map((d) => d.readings.find((r) => r.id === 'stagnation')?.value ?? 0),
  );

  return {
    baseTime,
    season,
    primaryIndicators: activeIds,
    cityAverage: averageBreakdown(districts.map((d) => d.breakdown)),
    districts,
    stagnation: makeReading('stagnation', stagnationCity, baseTime, month),
    warnings,
    source: DATA_MODE,
  };
}

/* ── 내부 ──────────────────────────────────────────────── */

interface BuildReadingArgs {
  id: IndicatorId;
  baseTime: string;
  month: number;
  air: AirValues | undefined;
  forecast: ForecastValues | undefined;
  warnings: WeatherWarning[];
  pollenValues: Map<IndicatorId, number | null>;
}

/** 지표 하나의 원단위값을 만들어 Reading으로 감싼다 */
function buildReading(args: BuildReadingArgs): IndicatorReading {
  const { id, baseTime, month, air, forecast, warnings, pollenValues } = args;

  switch (id) {
    case 'pinePollen':
    case 'oakPollen':
    case 'weedPollen':
      return makeReading(id, pollenValues.get(id) ?? null, baseTime, month);

    case 'pm10':
      return makeReading(id, air?.pm10 ?? null, baseTime, month);
    case 'pm25':
      return makeReading(id, air?.pm25 ?? null, baseTime, month);
    case 'ozone':
      return makeReading(id, air?.ozone ?? null, baseTime, month);

    case 'yellowDust':
      // 황사는 별도 관측값이 아니라 PM10 급등으로 판정한다.
      // 경계값이 [150, 300, 800]이라 평상시 PM10에서는 자동으로 0점이 된다.
      return makeReading(id, air?.pm10 ?? null, baseTime, month);

    case 'heat':
    case 'cold': {
      if (!forecast) return makeReading(id, null, baseTime, month);
      // 단기예보에 체감온도 필드가 없어 TMP·REH·WSD로 직접 산출한다
      const derived = apparentTemp(forecast);
      const grade = warnings.find((w) => w.type === id)?.grade ?? null;
      return makeReading(id, applyWarningFloor(derived, id, grade), baseTime, month);
    }

    case 'stagnation':
      // 정체지수는 보정계수로만 쓰이므로 여기서는 만들지 않는다
      return makeReading(id, null, baseTime, month);
  }
}

/**
 * 단기예보를 격자 단위로 묶어서 호출한다.
 *
 * 단기예보 격자는 약 5km 간격인데 대전은 시 전체가 25km 남짓이라
 * 인접한 구가 같은 (nx, ny)를 공유한다. 구마다 부르면 같은 응답을
 * 중복으로 받으면서 트래픽 한도만 깎아먹는다.
 */
async function fetchForecastsDeduped(
  scenario: Scenario,
  referenceDate: Date,
): Promise<Partial<Record<DistrictId, ForecastValues>>> {
  const groups = new Map<string, DistrictId[]>();
  for (const d of DISTRICTS) {
    const key = `${d.grid.nx},${d.grid.ny}`;
    groups.set(key, [...(groups.get(key) ?? []), d.id]);
  }

  const out: Partial<Record<DistrictId, ForecastValues>> = {};

  await Promise.all(
    [...groups.values()].map(async (memberIds) => {
      const res = await fetchVilageFcst(scenario, memberIds[0], referenceDate);
      const parsed = parseVilageFcst(res);
      if (!parsed) return;
      for (const id of memberIds) out[id] = parsed;
    }),
  );

  return out;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
