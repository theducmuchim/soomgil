import type { DistrictId, IndicatorReading, RiskLevel, RiskSnapshot } from '@/types';
import { DISTRICTS } from '@/data/districts';
import { getScenario } from '@/mocks/scenarios';
import { levelFromScore, normalizeIndicator, scoreArea } from '@/lib/risk/score';
import { getSeasonWeights } from '@/lib/risk/season';
import { apparentTemp } from '@/lib/risk/apparent-temp';
import { makeReading } from '@/lib/normalize/reading';
import {
  diffusionToStagnation,
  indexSeriesByHour,
  parseVilageFcstSeries,
} from '@/lib/normalize/kma';
import { kstParts, kstStampToDate, kstYmdH } from '@/lib/utils/time';
import { fetchVilageFcst } from './kma-forecast';
import { fetchStagnation } from './kma-stagnation';

export interface HourlyPoint {
  /** 0~23시 (KST) */
  hour: number;
  /** 그 시각의 대전 평균 위험도 */
  score: number;
  level: RiskLevel;
  /** 기준 시각(지금)에 해당하는 점 */
  isNow: boolean;
  /**
   * 이 점이 실제 예보값으로 계산됐는지.
   *
   * false 면 예보가 닿지 않아 현재값을 그대로 둔 지점이다. 화면에서 "예보 기반"과
   * "현재값 유지"를 구분해야 평평한 구간을 버그로 오해하지 않는다.
   */
  forecast: boolean;
}

/**
 * 앞으로 24시간 위험도 추이.
 *
 * ── 왜 "오늘 0~23시"가 아닌가 ───────────────────────────
 * 예전에는 오늘 0시부터 23시까지를 그렸다. 그런데 단기예보는 **발표 시각 이후**만
 * 준다. 지나간 시각의 예보는 응답에 없고 관측 이력을 주는 API 도 따로 없다.
 * 그래서 오늘 0~23시를 채우려면 지난 시각을 지어내야 했다.
 *
 * 이 화면이 답하려는 질문도 "지금 이후 언제 나가는 게 나은가"이므로,
 * 지금부터 24시간을 그리는 편이 데이터와 목적 양쪽에 맞는다.
 *
 * ── 무엇이 시간에 따라 실제로 움직이는가 ────────────────
 *   체감온도(폭염·한파) : 단기예보의 시각별 기온·습도·풍속으로 매 시각 다시 산출
 *   대기정체            : 대기확산지수의 3시간 간격 예보를 시각에 맞춰 사용
 *   미세먼지·오존·꽃가루 : **현재값을 유지한다**
 *
 * 마지막 줄이 중요하다. 에어코리아는 시간별 예보를 주지 않는다(등급 예보는 하루 단위,
 * 꽃가루도 하루 단위다). 그럴듯한 일변화 곡선을 지어 넣을 수는 있지만 그건 관측이
 * 아니라 창작이다. 대신 그 지표들은 현재값에 묶어 두고, 화면에 무엇이 예보 기반인지
 * 밝힌다.
 *
 * 여름에는 체감온도가 가장 큰 기여 지표라 이것만으로도 오후 정점이 제대로 나타난다.
 */
export async function getHourlyTrend(snapshot: RiskSnapshot): Promise<HourlyPoint[]> {
  if (snapshot.source === 'mock') return mockTrend(snapshot);

  try {
    return await liveTrend(snapshot);
  } catch (error) {
    // 추이 하나 때문에 통계 화면 전체가 죽으면 안 된다
    console.warn('[soomgil] 시간대별 추이 계산 실패 — 현재값으로 대체합니다.', error);
    return flatTrend(snapshot);
  }
}

/** 오늘 남은 시간 중 가장 안전한 시간대 */
export function safestHours(trend: HourlyPoint[], count = 3): HourlyPoint[] {
  /*
   * 추이가 이미 "지금부터 앞으로"라서 따로 지난 시각을 걸러낼 필요가 없다.
   *
   * 값이 같을 때는 이른 시각을 앞에 둔다. 정렬만 하면 같은 점수가 배열 순서대로
   * 나와 "20시·21시·22시" 처럼 연달아 붙는데, 그건 추천이 아니라 나열이다.
   */
  return [...trend]
    .sort((a, b) => a.score - b.score || trend.indexOf(a) - trend.indexOf(b))
    .slice(0, count);
}

/* ── 실데이터 ──────────────────────────────────────────── */

async function liveTrend(snapshot: RiskSnapshot): Promise<HourlyPoint[]> {
  const now = new Date(snapshot.baseTime);
  const { month } = kstParts(now);
  const weights = getSeasonWeights(snapshot.season, month);
  const scenario = getScenario(snapshot.season);

  /*
   * 단기예보는 격자가 겹치는 구를 한 번만 부른다 — getRiskSnapshot 과 같은 규칙이라
   * Next 의 fetch 캐시에서 같은 응답을 그대로 재사용한다. 추가 호출량이 없다.
   */
  const gridGroups = new Map<string, DistrictId[]>();
  for (const d of DISTRICTS) {
    const key = `${d.grid.nx},${d.grid.ny}`;
    gridGroups.set(key, [...(gridGroups.get(key) ?? []), d.id]);
  }

  /** 자치구 → ('YYYYMMDDHH' → 그 시각의 기온·습도·풍속) */
  const fcst = new Map<string, Map<string, ForecastLike>>();

  await Promise.all(
    [...gridGroups.values()].map(async (members) => {
      const res = await fetchVilageFcst(scenario, members[0], now);
      const series = parseVilageFcstSeries(res);
      for (const id of members) fcst.set(id, series);
    }),
  );

  const indexTime = kstYmdH(now);
  const diffusion = new Map<string, Map<string, number>>();
  await Promise.all(
    DISTRICTS.map(async (d) => {
      const res = await fetchStagnation(scenario, d.areaNo, indexTime);
      diffusion.set(d.id, indexSeriesByHour(res));
    }),
  );

  const points: HourlyPoint[] = [];

  for (let i = 0; i < 24; i++) {
    const at = new Date(now.getTime() + i * 3_600_000);
    const stamp = kstYmdH(at);
    const iso = at.toISOString();

    let forecastBacked = false;
    const scores: number[] = [];

    for (const district of snapshot.districts) {
      const series = fcst.get(district.areaId);
      const exact = series?.get(stamp);
      if (exact) forecastBacked = true;

      /*
       * 예보가 없는 시각은 가장 가까운 예보 시각의 값을 쓴다.
       *
       * 단기예보는 발표 시각 이후만 주므로 '지금'에 해당하는 시각이 빠져 있을 때가
       * 있다. 그때 스냅샷의 현재 값으로 되돌리면 곡선에 절벽이 생긴다 — 스냅샷 값은
       * 특보 하한이 걸린 값이라 규칙이 다르기 때문이다. 한 곡선 안에서는 규칙이
       * 하나여야 읽을 수 있다.
       */
      const hourly = exact ?? (series ? nearest(series, at) : undefined);

      const readings: IndicatorReading[] = district.readings
        .filter((r) => r.id !== 'stagnation')
        .map((r) => {
          if ((r.id !== 'heat' && r.id !== 'cold') || !hourly) return r;

          /*
           * ⚠ 특보 하한(applyWarningFloor)은 여기서 쓰지 않는다.
           *
           * 폭염특보는 **일최고 체감온도**가 기준이다(주의보 33℃·경보 35℃).
           * 하루 중 매 시각이 그 온도라는 뜻이 아니다. 그런데 시각마다 하한을
           * 걸었더니 새벽 24℃ 예보까지 33℃로 올라가 곡선이 통째로 평평해졌다.
           * 실제로 이 버그로 추이 그래프가 하루 종일 같은 값이었다.
           *
           * 이 화면이 답하는 질문은 "언제 나가는 게 나은가"라는 **상대적** 비교다.
           * 하한을 걸면 그 비교에 필요한 정보가 통째로 지워진다. 그래서 여기서는
           * 예보에서 산출한 값을 그대로 쓴다.
           *
           * 대신 화면 상단의 '지금' 종합 점수와는 값이 다를 수 있다. 그쪽은 특보
           * 하한을 반영한 값이기 때문이다. 그 차이는 안내 문구로 밝힌다.
           */
          return makeReading(r.id, apparentTemp(hourly), iso, month);
        });

      const diff = diffusion.get(district.areaId)?.get(stamp);
      const stagnationNormalized =
        diff === undefined
          ? (district.readings.find((r) => r.id === 'stagnation')?.normalized ?? 0)
          : normalizeIndicator('stagnation', diffusionToStagnation(diff) ?? 0);

      scores.push(scoreArea(readings, weights, stagnationNormalized).score);
    }

    const score = round1(average(scores));
    points.push({
      hour: kstParts(at).hour,
      score,
      level: levelFromScore(score),
      isNow: i === 0,
      forecast: forecastBacked,
    });
  }

  return points;
}

/** 시각 목록에서 at 에 가장 가까운 예보를 고른다 */
function nearest(
  series: Map<string, ForecastLike>,
  at: Date,
): ForecastLike | undefined {
  let best: ForecastLike | undefined;
  let bestGap = Infinity;

  for (const [stamp, value] of series) {
    const t = kstStampToDate(stamp);
    if (!t) continue;
    const gap = Math.abs(t.getTime() - at.getTime());
    if (gap < bestGap) {
      bestGap = gap;
      best = value;
    }
  }

  return best;
}

/** parseVilageFcstSeries 가 돌려주는 값의 형태 */
type ForecastLike = {
  tempC: number;
  humidity: number;
  windMs: number;
  windDeg: number;
};

/* ── 예시 데이터 ───────────────────────────────────────── */

/**
 * 시나리오의 hourlyProfile(시간대별 배수)을 기준 시각의 점수에 맞춰 스케일한다.
 * 그래서 "지금" 지점의 값은 화면 다른 곳의 종합 점수와 정확히 일치한다.
 */
function mockTrend(snapshot: RiskSnapshot): HourlyPoint[] {
  const now = new Date(snapshot.baseTime);
  const nowHour = kstParts(now).hour;
  const current = snapshot.cityAverage.score;
  const profile = getScenario(snapshot.season).hourlyProfile;
  const atNow = profile[nowHour] || 1;

  return Array.from({ length: 24 }, (_, i) => {
    const hour = (nowHour + i) % 24;
    const score = clamp(round1((current * profile[hour]) / atNow), 0, 100);
    return { hour, score, level: levelFromScore(score), isNow: i === 0, forecast: true };
  });
}

/** 예보를 못 받았을 때 — 현재값을 그대로 편다 (평평하다는 사실을 화면에 밝힌다) */
function flatTrend(snapshot: RiskSnapshot): HourlyPoint[] {
  const nowHour = kstParts(new Date(snapshot.baseTime)).hour;
  const score = snapshot.cityAverage.score;

  return Array.from({ length: 24 }, (_, i) => ({
    hour: (nowHour + i) % 24,
    score,
    level: levelFromScore(score),
    isNow: i === 0,
    forecast: false,
  }));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
