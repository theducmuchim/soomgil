import type { AreaRisk } from '@/types';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { scoreColor } from '@/lib/risk/color';
import { formatDelta, formatValue } from '@/lib/utils/format';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { WindArrow } from '@/components/map/WindArrow';
import { cn } from '@/lib/utils/cn';

/**
 * 지역 한 곳의 상세.
 *
 * 종합 점수만 보여주면 "왜 이 점수인지"를 알 수 없어서
 * 보정 전 → 보정계수 → 보정 후 흐름과 지표별 기여도를 모두 편다.
 */
export function AreaDetailPanel({
  area,
  /** 행정동처럼 추정치인 경우 표시 */
  estimated = false,
  className,
}: {
  area: AreaRisk;
  estimated?: boolean;
  className?: string;
}) {
  const color = scoreColor(area.score);
  const b = area.breakdown;
  const maxPoints = Math.max(...b.contributions.map((c) => c.points), 1);

  const stagnation = area.readings.find((r) => r.id === 'stagnation');

  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.0625rem] font-bold text-ink-900">{area.areaName}</h3>
          <p className="mt-1 text-[0.71875rem] text-ink-400">
            주요 요인 {INDICATORS[area.dominantIndicator].shortLabel}
            {estimated && ' · 추정치'}
          </p>
        </div>
        <RiskBadge level={area.level} size="md" />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span
          className="tabular text-[2.375rem] leading-none font-bold tracking-tight"
          style={{ color }}
        >
          {Math.round(area.score)}
        </span>
        <span className="pb-1 text-[0.78125rem] text-ink-400">/ 100</span>
      </div>

      {/* 보정 전 → 보정계수 → 보정 후 */}
      <div className="mt-4 rounded-xl bg-surface-sunken p-3.5">
        <p className="text-[0.71875rem] font-semibold text-ink-700">점수 계산</p>
        <div className="tabular mt-2.5 flex items-center gap-2 text-[0.78125rem]">
          <span className="rounded-md bg-surface px-2 py-1 font-semibold text-ink-900">
            {b.baseScore}
          </span>
          <span className="text-ink-400" aria-hidden="true">
            ×
          </span>
          <span className="rounded-md bg-surface px-2 py-1 font-semibold text-brand-600">
            {b.stagnationFactor}
          </span>
          <span className="text-ink-400" aria-hidden="true">
            =
          </span>
          <span
            className="rounded-md px-2 py-1 font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {b.score}
          </span>
        </div>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-400">
          지표 가중합 {b.baseScore}점에 대기정체 보정
          {stagnation ? ` (지수 ${Math.round(stagnation.value)})` : ''}을 적용해{' '}
          <span className="font-semibold text-risk-high">
            {formatDelta(b.stagnationDeltaPct, 1)}
          </span>{' '}
          올랐습니다.
        </p>
      </div>

      {/* 지표별 기여도 */}
      {b.contributions.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.71875rem] font-semibold text-ink-700">지표별 기여도</p>
          <ul className="mt-2.5 space-y-2.5">
            {b.contributions.map((c) => {
              const meta = INDICATORS[c.id];
              const reading = area.readings.find((r) => r.id === c.id);
              return (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
                    <span className="font-medium text-ink-700">
                      {meta.shortLabel}
                      <span className="ml-1.5 text-ink-300">
                        비중 {Math.round(c.weight * 100)}%
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-ink-500">
                      {reading ? formatValue(reading.value, meta.unit) : '-'}
                      {meta.unit !== '℃' && meta.unit !== '지수' && ` ${meta.unit}`}
                      <span
                        className="ml-2 font-semibold"
                        style={{
                          color: reading
                            ? RISK_LEVELS[reading.level].color
                            : undefined,
                        }}
                      >
                        {reading ? RISK_LEVELS[reading.level].label : ''}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.points / maxPoints) * 100}%`,
                        backgroundColor: scoreColor(c.normalized),
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 바람 */}
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <WindArrow degree={area.wind.degree} className="h-9 w-9 shrink-0" />
        <div>
          <p className="text-[0.78125rem] font-semibold text-ink-900">
            {area.wind.label}풍 {area.wind.speed}m/s
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-ink-400">
            {area.wind.speed < 2
              ? '바람이 약해 오염물질이 잘 흩어지지 않습니다.'
              : '이 방향의 풍하측 지역으로 오염물질이 밀려갑니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
