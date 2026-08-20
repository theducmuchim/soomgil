import type { RiskLevel, RiskSnapshot } from '@/types';
import { getScenario } from '@/mocks/scenarios';
import { levelFromScore } from '@/lib/risk/score';
import { kstParts } from '@/lib/utils/time';
import { DATA_MODE } from '@/lib/env';

export interface HourlyPoint {
  /** 0~23시 (KST) */
  hour: number;
  /** 그 시각의 대전 평균 위험도 */
  score: number;
  level: RiskLevel;
  /** 기준 시각(지금)에 해당하는 점 */
  isNow: boolean;
}

/**
 * 오늘 24시간 위험도 추이.
 *
 * mock 모드
 *   시나리오의 hourlyProfile(시간대별 배수)을 기준 시각의 실제 점수에 맞춰 스케일한다.
 *   그래서 "지금" 지점의 값은 화면 다른 곳의 종합 점수와 정확히 일치한다.
 *   프로파일은 계절마다 다르다 — 꽃가루는 오전, 오존은 오후, 미세먼지는 출퇴근에 정점.
 *
 * TODO(live)
 *   기상청 지수류 응답에는 h0·h3·h6…h72 로 3시간 간격 예보값이 들어 있고
 *   (lib/normalize/kma.ts의 parseIndexSeries가 이미 파싱한다),
 *   에어코리아 예보통보에는 오늘/내일 등급이 들어 있다.
 *   이 둘을 합쳐 같은 형태의 배열을 만들면 화면은 그대로 동작한다.
 */
export function getHourlyTrend(snapshot: RiskSnapshot): HourlyPoint[] {
  const nowHour = kstParts(new Date(snapshot.baseTime)).hour;
  const current = snapshot.cityAverage.score;

  const profile =
    DATA_MODE === 'mock'
      ? getScenario(snapshot.season).hourlyProfile
      : // live 전환 전까지의 임시 대체 — 평탄한 곡선
        Array.from({ length: 24 }, () => 1);

  const atNow = profile[nowHour] || 1;

  return Array.from({ length: 24 }, (_, hour) => {
    const score = clamp(round1((current * profile[hour]) / atNow), 0, 100);
    return {
      hour,
      score,
      level: levelFromScore(score),
      isNow: hour === nowHour,
    };
  });
}

/** 오늘 남은 시간 중 가장 안전한 시간대 */
export function safestHours(
  trend: HourlyPoint[],
  fromHour: number,
  count = 3,
): HourlyPoint[] {
  const remaining = trend.filter((p) => p.hour >= fromHour);
  const pool = remaining.length >= count ? remaining : trend;
  return [...pool].sort((a, b) => a.score - b.score).slice(0, count);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
