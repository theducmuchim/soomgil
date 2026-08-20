import type { IndicatorId, IndicatorReading } from '@/types';
import { normalizeIndicator, levelFromNormalized } from '@/lib/risk/score';
import { isIndicatorAvailable } from '@/lib/risk/season';

/**
 * 원단위값 하나를 도메인 Reading으로 만든다.
 * 정규화·등급·서비스기간 판정을 한 곳에서만 하도록 모아둔 함수.
 */
export function makeReading(
  id: IndicatorId,
  value: number | null,
  observedAt: string,
  month: number,
): IndicatorReading {
  const inService = isIndicatorAvailable(id, month);
  const available = inService && value !== null && Number.isFinite(value);
  const v = available ? (value as number) : 0;
  const normalized = available ? normalizeIndicator(id, v) : 0;

  return {
    id,
    value: v,
    normalized,
    level: levelFromNormalized(normalized),
    observedAt,
    available,
  };
}
