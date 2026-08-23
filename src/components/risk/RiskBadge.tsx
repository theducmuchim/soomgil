import type { RiskLevel } from '@/types';
import { RISK_LEVELS } from '@/config/indicators';
import { scoreTextColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';

/**
 * 위험 등급 배지.
 * 색만으로 등급을 구분하지 않도록 항상 한글 라벨을 함께 쓴다(색각 이상 대응).
 */
export function RiskBadge({
  level,
  size = 'md',
  className,
}: {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const meta = RISK_LEVELS[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' && 'px-2 py-0.5 text-[0.75rem]',
        size === 'md' && 'px-2.5 py-1 text-[0.8125rem]',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        meta.bg,
        meta.text,
        'ring-1 ring-inset',
        level === 'low' && 'ring-risk-low/25',
        level === 'moderate' && 'ring-risk-moderate/25',
        level === 'high' && 'ring-risk-high/25',
        level === 'veryHigh' && 'ring-risk-very-high/25',
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}

/** 점수 + 등급을 한 덩어리로 보여주는 표시 */
export function RiskScore({
  score,
  level,
  className,
}: {
  score: number;
  level: RiskLevel;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end gap-2', className)}>
      {/* 큰 숫자는 글자라서 면용 색이 아니라 글자용 색을 쓴다 (lib/risk/color.ts) */}
      <span
        className="tabular text-[2.5rem] leading-none font-bold"
        style={{ color: scoreTextColor(score) }}
      >
        {Math.round(score)}
      </span>
      <span className="pb-1 text-[0.8125rem] font-medium text-ink-400">/ 100</span>
      <RiskBadge level={level} className="mb-1 ml-1" />
    </div>
  );
}
