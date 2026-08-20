import type { Geometry } from 'geojson';
import type { AreaRisk, IndicatorId, IndicatorReading, RiskSnapshot } from '@/types';
import { DONG_GEOJSON } from '@/data/geo/dong';
import { DAEJEON_CENTER } from '@/data/districts';
import { levelFromNormalized, levelFromScore, scoreArea } from '@/lib/risk/score';
import { getSeasonWeights } from '@/lib/risk/season';
import { kstParts } from '@/lib/utils/time';

/**
 * 행정동 단위 위험도.
 *
 * ⚠ 이 값은 관측값이 아니라 추정치다.
 *
 * 대기질 관측은 에어코리아 도시대기 측정소 단위(대전 10곳)이고, 기상 예보 격자는
 * 약 5km라 행정동 78개를 직접 관측하는 데이터는 존재하지 않는다.
 * 그래서 자치구 관측값에 아래 두 가지를 입혀 동 단위로 추정한다.
 *
 * ── ① 도심도(centrality) 보정 ────────────────────────────────
 * 무작위로 흔들면 지도가 얼룩덜룩해질 뿐 의미가 없고, 경로 추천도 성립하지 않는다.
 * 실제 공간 분포를 따라가야 "왜 이 길로 우회하는지"가 설명된다.
 *
 *   미세먼지·오존·황사·폭염 : 도심일수록 높다
 *       도로 교통량과 열섬 효과가 도심에 집중된다.
 *   꽃가루                  : 도심일수록 낮다
 *       소나무·참나무·잡초 발생원은 외곽 산림과 하천변이다.
 *   한파                    : 도심일수록 덜하다
 *       열섬 효과로 도심 최저기온이 외곽보다 높다.
 *
 * 그래서 계절이 바뀌면 지도의 공간 패턴도 뒤집힌다.
 * 봄에는 산에 접한 외곽이 나쁘고, 겨울에는 도심이 나쁘다.
 * 이건 억지로 만든 게 아니라 실제로 그렇게 나타나는 분포다.
 *
 * ── ② 결정적 미세 편차 ──────────────────────────────────────
 * 같은 도심도라도 동마다 조금씩 다르게 보이도록 ±6% 흔든다.
 * Math.random()이 아니라 행정동 코드 해시를 쓴다.
 *  - 새로고침마다 순위가 바뀌면 데이터로 보이지 않는다
 *  - 서버/클라이언트 렌더 결과가 달라지면 hydration 불일치가 난다
 *
 * 화면에는 반드시 "행정동 값은 자치구 관측값을 바탕으로 한 추정치"라고 밝힌다.
 * (components/map/RiskMapView.tsx, /guide 참조)
 */

/** 도심도에 따른 최대 증감폭 (±25%) */
const CENTRALITY_AMPLITUDE = 0.25;

/** 동별 미세 편차 (±6%) */
const DONG_JITTER = 0.06;

/**
 * 지표별 도심 방향.
 *  +1 : 도심일수록 높다
 *  -1 : 도심일수록 낮다
 */
const CENTRALITY_SIGN: Record<IndicatorId, number> = {
  pm10: 1,
  pm25: 1,
  ozone: 1,
  yellowDust: 1,
  heat: 1, // 열섬
  cold: -1, // 열섬으로 도심이 덜 춥다 (한파 위험도는 도심에서 낮아짐)
  pinePollen: -1, // 외곽 산림
  oakPollen: -1,
  weedPollen: -1, // 하천변·유휴지
  stagnation: 0, // 시 전역 공통, 보정계수라 건드리지 않는다
};

export function deriveDongRisks(snapshot: RiskSnapshot): AreaRisk[] {
  const { month } = kstParts(new Date(snapshot.baseTime));
  const weights = getSeasonWeights(snapshot.season, month);
  const districtById = new Map(snapshot.districts.map((d) => [d.areaId, d]));
  const centrality = getCentralityMap();

  return DONG_GEOJSON.features.map((feature) => {
    const props = feature.properties;
    const parent = districtById.get(props.districtId);
    if (!parent) return emptyArea(props.id, props.name);

    // -1(외곽) ~ +1(도심)
    const c = (centrality.get(props.id) ?? 0.5) * 2 - 1;
    const jitter = (hashUnit(props.code) * 2 - 1) * DONG_JITTER;

    const readings: IndicatorReading[] = parent.readings.map((r) => {
      if (!r.available || r.id === 'stagnation') return r;

      const sign = CENTRALITY_SIGN[r.id] ?? 0;
      const factor = 1 + c * sign * CENTRALITY_AMPLITUDE + jitter;

      const normalized = clamp(round1(r.normalized * factor), 0, 100);
      return {
        ...r,
        normalized,
        level: levelFromNormalized(normalized),
        // 원단위값도 같은 비율로 움직여야 상세 패널의 숫자가 어긋나지 않는다.
        // 체감온도는 비율이 아니라 절대값이 의미를 가지므로 따로 처리한다.
        value:
          r.id === 'heat' || r.id === 'cold'
            ? round1(r.value + c * sign * 1.5)
            : round1(r.value * factor),
      };
    });

    const stagnation = parent.readings.find((rd) => rd.id === 'stagnation');
    const breakdown = scoreArea(readings, weights, stagnation?.normalized ?? 0);

    return {
      areaId: props.id,
      areaName: props.name,
      score: breakdown.score,
      level: levelFromScore(breakdown.score),
      breakdown,
      dominantIndicator: breakdown.contributions[0]?.id ?? parent.dominantIndicator,
      readings: stagnation ? [...readings, stagnation] : readings,
      // 바람은 격자 해상도상 자치구 값을 그대로 물려받는다
      wind: parent.wind,
    } satisfies AreaRisk;
  });
}

/**
 * 행정동별 도심도 (0 = 가장 외곽, 1 = 가장 도심).
 *
 * 대전 중심좌표에서 각 동 중심까지의 거리를 구해 0~1로 편다.
 * 대전은 도심(둔산·은행동)이 지리적 중앙에 가깝고 외곽이 산지라
 * 이 단순한 지표가 실제 도시 구조와 잘 맞는다.
 *
 * 경계 데이터가 바뀌지 않으므로 한 번만 계산해 캐시한다.
 */
let centralityCache: Map<string, number> | null = null;

function getCentralityMap(): Map<string, number> {
  if (centralityCache) return centralityCache;

  const distances = DONG_GEOJSON.features.map((f) => {
    const [lat, lng] = centroidOf(f.geometry);
    const dLat = (lat - DAEJEON_CENTER[0]) * 111.32;
    const dLng =
      (lng - DAEJEON_CENTER[1]) * 111.32 * Math.cos((DAEJEON_CENTER[0] * Math.PI) / 180);
    return { id: f.properties.id, distKm: Math.sqrt(dLat * dLat + dLng * dLng) };
  });

  const max = Math.max(...distances.map((d) => d.distKm));
  const min = Math.min(...distances.map((d) => d.distKm));
  const span = max - min || 1;

  centralityCache = new Map(
    // 거리가 멀수록 도심도가 낮다
    distances.map((d) => [d.id, 1 - (d.distKm - min) / span]),
  );
  return centralityCache;
}

/** 폴리곤 bbox 중심 — 행정동 크기에서는 무게중심과 큰 차이가 없다 */
function centroidOf(geometry: Geometry): [number, number] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  const rings =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates.flat()
        : [];

  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

/** 행정동 코드 → 부모 자치구 id */
export function dongParentId(dongId: string): string | undefined {
  return DONG_GEOJSON.features.find((f) => f.properties.id === dongId)?.properties
    .districtId;
}

function emptyArea(areaId: string, areaName: string): AreaRisk {
  return {
    areaId,
    areaName,
    score: 0,
    level: 'low',
    breakdown: {
      baseScore: 0,
      stagnationFactor: 1,
      score: 0,
      stagnationDeltaPct: 0,
      contributions: [],
    },
    dominantIndicator: 'pm10',
    readings: [],
    wind: { degree: 0, speed: 0, label: '북' },
  };
}

/** 문자열 → 0~1 결정적 값 (FNV-1a) */
function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
