import type { IndicatorReading } from '@/types';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { formatValue } from '@/lib/utils/format';
import { scoreColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';

/**
 * 지표 하나의 현재값 카드.
 *
 * 값(µg/m³·ppm·℃·지수)은 지표마다 단위가 달라 그대로는 비교가 안 된다.
 * 그래서 원단위값과 함께 0~100 정규화 막대를 붙여, 서로 다른 지표를
 * 같은 눈금에서 비교할 수 있게 한다.
 */
export function IndicatorCard({
  reading,
  /** 이번 계절 종합 점수에서 이 지표가 차지하는 가중치 (0~1) */
  weight,
  className,
}: {
  reading: IndicatorReading;
  weight?: number;
  className?: string;
}) {
  const meta = INDICATORS[reading.id];
  const levelMeta = RISK_LEVELS[reading.level];
  const color = scoreColor(reading.normalized);

  if (!reading.available) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-line bg-surface-raised p-4',
          className,
        )}
      >
        <p className="text-[0.78125rem] font-semibold text-ink-400">{meta.shortLabel}</p>
        <p className="mt-2 text-[0.8125rem] font-medium text-ink-300">서비스 기간 아님</p>
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-300">
          {meta.serviceMonths
            ? `${meta.serviceMonths[0]}월~${meta.serviceMonths[meta.serviceMonths.length - 1]}월에만 제공됩니다`
            : '데이터를 받지 못했습니다'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.78125rem] font-semibold text-ink-700">{meta.shortLabel}</p>
        {weight !== undefined && weight > 0 && (
          <span className="tabular shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[0.65625rem] font-medium text-ink-400">
            비중 {Math.round(weight * 100)}%
          </span>
        )}
      </div>

      <p className="mt-2.5 flex items-baseline gap-1">
        <span className="tabular text-[1.375rem] leading-none font-bold text-ink-900">
          {formatValue(reading.value, meta.unit)}
        </span>
        {meta.unit !== '℃' && (
          <span className="text-[0.71875rem] font-medium text-ink-400">
            {meta.unit === '지수' ? '단계' : meta.unit}
          </span>
        )}
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, reading.normalized)}%`, backgroundColor: color }}
        />
      </div>

      <p className="mt-2 flex items-center justify-between text-[0.6875rem]">
        <span className="font-semibold" style={{ color: levelMeta.color }}>
          {levelMeta.label}
        </span>
        <span className="tabular text-ink-300">{reading.normalized}/100</span>
      </p>
    </div>
  );
}
