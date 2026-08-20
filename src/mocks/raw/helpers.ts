import type { Scenario } from '@/mocks/scenarios';
import { kstParts } from '@/lib/utils/time';

/** 'YYYYMMDDHH' */
export function ymdH(iso: string): string {
  const { year, month, day, hour } = kstParts(new Date(iso));
  return `${year}${p2(month)}${p2(day)}${p2(hour)}`;
}

/** 'YYYYMMDD' */
export function ymd(iso: string): string {
  return ymdH(iso).slice(0, 8);
}

/** 'HHmm' */
export function hhmm(iso: string): string {
  const { hour, minute } = kstParts(new Date(iso));
  return `${p2(hour)}${p2(minute)}`;
}

/** '2026-08-06 15:00' — 에어코리아 dataTime 형식 */
export function airkoreaTime(iso: string): string {
  const { year, month, day, hour } = kstParts(new Date(iso));
  return `${year}-${p2(month)}-${p2(day)} ${p2(hour)}:00`;
}

export function baseHour(iso: string): number {
  return kstParts(new Date(iso)).hour;
}

/**
 * 결정적 흔들림.
 *
 * 측정소마다 값이 조금씩 다른 게 실제 데이터의 모습이라 일부러 넣는다.
 * 다만 Math.random()을 쓰면 서버 렌더와 클라이언트 렌더 값이 달라져
 * hydration 불일치가 나므로, 문자열 해시로 항상 같은 값이 나오게 만든다.
 *
 * @param amplitude ±비율 (0.06 = ±6%)
 */
export function jitter(seed: string, amplitude: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0~1 로 펴기
  const unit = ((h >>> 0) % 1000) / 1000;
  return 1 + (unit * 2 - 1) * amplitude;
}

/**
 * 시간대별 값 생성.
 * 시나리오의 hourlyProfile을 기준시각에 맞춰 돌려 쓴다.
 * h0 = 기준시각, h3 = +3시간 … 형태로 72시간까지.
 */
export function hourlySeries(
  scenario: Scenario,
  baseValue: number,
  hours: number[],
): Record<string, string> {
  const start = baseHour(scenario.baseTime);
  const profile = scenario.hourlyProfile;
  const atBase = profile[start] || 1;

  const out: Record<string, string> = {};
  for (const h of hours) {
    const idx = (start + h) % 24;
    // 기준시각 값이 시나리오에 적힌 값 그대로가 되도록 보정
    const ratio = profile[idx] / atBase;
    out[`h${h}`] = String(round1(baseValue * ratio));
  }
  return out;
}

/** 꽃가루지수처럼 0~3 이산값인 시계열 */
export function hourlySeriesDiscrete(
  scenario: Scenario,
  baseValue: number,
  hours: number[],
  max = 3,
): Record<string, string> {
  const raw = hourlySeries(scenario, baseValue, hours);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = String(Math.max(0, Math.min(max, Math.round(Number(v)))));
  }
  return out;
}

/** 기상청 지수류가 주는 예보 시각 (3시간 간격, 72시간) */
export const INDEX_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72];

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function p2(n: number): string {
  return String(n).padStart(2, '0');
}
