import type {
  IndicatorId,
  IndicatorReading,
  RiskLevel,
  ScoreBreakdown,
  ScoreContribution,
} from '@/types';
import { INDICATORS } from '@/config/indicators';

/**
 * 위험 점수 엔진
 *
 * 흐름
 *   지표 원단위값 → ① 0~100 정규화 → ② 계절 가중합(= 보정 전 점수)
 *                → ③ 대기정체 보정계수 곱 → ④ 0~100 클램프(= 최종 점수)
 *
 * ②③④를 ScoreBreakdown 에 전부 남긴다. 화면에서 "대기정체로 +18% 상승"을
 * 그리려면 보정 전 값이 필요한데, 최종 점수에서 역산하면 ④의 클램프 때문에
 * 값이 틀어지기 때문이다.
 */

/** 등급 경계는 정규화값 25 / 50 / 75 에 정확히 맞춰져 있다 */
const LEVEL_CUTS = [25, 50, 75] as const;

/**
 * 지표값을 0~100으로 정규화한다.
 *
 * 단순히 value/max 로 나누지 않고, 지표별 4단계 경계값이 항상
 * 25 / 50 / 75 에 오도록 구간별 선형보간한다.
 * 이렇게 해야 단위가 전혀 다른 지표(µg/m³ vs ppm vs ℃ vs 지수 0~3)를
 * 같은 저울에 올릴 수 있고, "높음"은 어느 지표에서든 50~75점이 된다.
 *
 * 한파처럼 값이 낮을수록 위험한 지표(inverted)도 같은 함수로 처리된다.
 * stops 배열이 내림차순이 될 뿐이다.
 */
export function normalizeIndicator(id: IndicatorId, value: number): number {
  const meta = INDICATORS[id];
  const stops = [
    meta.normalizeMin ?? 0,
    meta.breakpoints[0],
    meta.breakpoints[1],
    meta.breakpoints[2],
    meta.normalizeMax,
  ];
  const targets = [0, 25, 50, 75, 100];

  const ascending = stops[stops.length - 1] > stops[0];

  // 범위 밖 처리
  if (ascending ? value <= stops[0] : value >= stops[0]) return 0;
  if (ascending ? value >= stops[4] : value <= stops[4]) return 100;

  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i];
    const hi = stops[i + 1];
    const inSegment = ascending
      ? value >= lo && value <= hi
      : value <= lo && value >= hi;

    if (inSegment) {
      const span = hi - lo;
      // 경계값이 겹치는 지표는 없지만 0으로 나누는 사고는 막아둔다
      const t = span === 0 ? 0 : (value - lo) / span;
      return round1(targets[i] + t * (targets[i + 1] - targets[i]));
    }
  }
  return 0;
}

/** 정규화값 → 4단계 등급 */
export function levelFromNormalized(normalized: number): RiskLevel {
  if (normalized < LEVEL_CUTS[0]) return 'low';
  if (normalized < LEVEL_CUTS[1]) return 'moderate';
  if (normalized < LEVEL_CUTS[2]) return 'high';
  return 'veryHigh';
}

/** 원단위값 → 4단계 등급 */
export function levelFromValue(id: IndicatorId, value: number): RiskLevel {
  return levelFromNormalized(normalizeIndicator(id, value));
}

/** 종합 점수(0~100) → 4단계 등급 */
export const levelFromScore = levelFromNormalized;

/**
 * 대기정체 보정계수의 최대 상승폭.
 *
 * 대전은 산으로 둘러싸인 분지라 같은 배출량이어도 정체 시 체감 농도가 확연히 다르다.
 * 다만 정체지수는 "쌓이는 정도"를 보는 보조 지표라 주 지표를 뒤집을 만큼 세면 안 된다.
 * 최대 +35% — 보통 등급의 지역을 한 단계 위로는 올릴 수 있지만
 * 낮음을 매우높음으로 뒤집지는 못하는 크기로 잡았다.
 */
export const MAX_STAGNATION_BOOST = 0.35;

/**
 * 대기정체지수 정규화값(0~100) → 보정계수(1.0 ~ 1.35)
 */
export function stagnationFactor(stagnationNormalized: number): number {
  const t = clamp(stagnationNormalized, 0, 100) / 100;
  return round3(1 + t * MAX_STAGNATION_BOOST);
}

/**
 * 지역 1곳의 종합 위험 점수를 낸다.
 *
 * @param readings  이 지역의 지표 실측/예보값 (available=false 인 건 무시)
 * @param weights   이번 계절의 가중치 (합이 1이 되도록 정규화된 것)
 * @param stagnationNormalized  대기정체지수의 0~100 정규화값
 */
export function scoreArea(
  readings: IndicatorReading[],
  weights: Partial<Record<IndicatorId, number>>,
  stagnationNormalized: number,
): ScoreBreakdown {
  const contributions: ScoreContribution[] = [];

  for (const reading of readings) {
    const weight = weights[reading.id];
    // 가중치가 없는 지표(= 이번 계절의 핵심이 아니거나 carryOver)는 점수에 넣지 않는다.
    // 화면에는 여전히 보이지만 종합 점수를 흔들지 않는다.
    if (!weight || !reading.available) continue;

    contributions.push({
      id: reading.id,
      weight,
      normalized: reading.normalized,
      points: round1(weight * reading.normalized),
    });
  }

  contributions.sort((a, b) => b.points - a.points);

  // ① 보정 전
  const baseScore = round1(contributions.reduce((sum, c) => sum + c.points, 0));

  // ② 보정계수
  const factor = stagnationFactor(stagnationNormalized);

  // ③ 보정 후 (0~100 클램프)
  const score = round1(clamp(baseScore * factor, 0, 100));

  // ④ 실제 상승률 — 클램프 이후 값 기준이라 화면에 그대로 써도 맞는다
  const stagnationDeltaPct =
    baseScore === 0 ? 0 : round1(((score - baseScore) / baseScore) * 100);

  return {
    baseScore,
    stagnationFactor: factor,
    score,
    stagnationDeltaPct,
    contributions,
  };
}

/** 점수를 가장 크게 끌어올린 지표 */
export function dominantIndicator(breakdown: ScoreBreakdown): IndicatorId {
  return breakdown.contributions[0]?.id ?? 'pm10';
}

/** 여러 지역의 평균 — 시 전체 요약에 쓴다 */
export function averageBreakdown(breakdowns: ScoreBreakdown[]): {
  score: number;
  level: RiskLevel;
  baseScore: number;
  stagnationDeltaPct: number;
} {
  if (breakdowns.length === 0) {
    return { score: 0, level: 'low', baseScore: 0, stagnationDeltaPct: 0 };
  }
  const avg = (pick: (b: ScoreBreakdown) => number) =>
    round1(breakdowns.reduce((s, b) => s + pick(b), 0) / breakdowns.length);

  const score = avg((b) => b.score);
  const baseScore = avg((b) => b.baseScore);

  return {
    score,
    level: levelFromScore(score),
    baseScore,
    stagnationDeltaPct:
      baseScore === 0 ? 0 : round1(((score - baseScore) / baseScore) * 100),
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}
