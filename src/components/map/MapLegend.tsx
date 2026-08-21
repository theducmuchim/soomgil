import { RISK_LEVELS } from '@/config/indicators';
import { scoreColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';

/**
 * 위험도 범례.
 *
 * 색은 연속 그라데이션이지만 등급 경계(25/50/75)를 눈금으로 찍어
 * "이 색이 어느 등급인지"를 읽을 수 있게 한다.
 */
export function MapLegend({
  className,
  note,
}: {
  className?: string;
  note?: string;
}) {
  // 그라데이션을 CSS로 재현 — scoreColor와 같은 앵커를 쓴다
  const stops = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]
    .map((s) => `${scoreColor(s)} ${s}%`)
    .join(', ');

  return (
    <div className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      <p className="text-[0.78125rem] font-semibold text-ink-900">위험도 범례</p>

      <div
        className="mt-3 h-2.5 w-full rounded-full"
        style={{ background: `linear-gradient(to right, ${stops})` }}
        role="img"
        aria-label="위험도 0점에서 100점까지의 색상 범례"
      />

      <div className="tabular mt-1.5 flex justify-between text-[0.65625rem] text-ink-400">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {(['low', 'moderate', 'high', 'veryHigh'] as const).map((level) => (
          <span
            key={level}
            className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-500"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: RISK_LEVELS[level].color }}
              aria-hidden="true"
            />
            {RISK_LEVELS[level].label}
          </span>
        ))}
      </div>

      {note && (
        <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-400">
          {note}
        </p>
      )}
    </div>
  );
}
