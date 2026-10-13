import type { RiskLevel } from '@/types';
import { RISK_LEVELS } from '@/config/indicators';
import { scoreTextColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';
import { CountUp } from '@/components/motion/CountUp';

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
      {/*
        큰 숫자는 글자라서 면용 색이 아니라 글자용 색을 쓴다 (lib/risk/color.ts).

        서체는 세리프(제주돌담체)다. 이 숫자는 화면에서 가장 큰 글자인데
        sans 볼드로 두면 옆의 배지·라벨과 같은 목소리로 읽힌다. 서체를 바꾸면
        크기를 더 키우지 않고도 "여기가 결론"이라는 게 구분된다.
        굵기 한 벌짜리라 font-normal 을 못 박는다.
      */}
      <span
        className="tabular font-display text-[2.75rem] leading-none font-normal"
        style={{ color: scoreTextColor(score) }}
      >
        <CountUp to={score} />
      </span>
      <span className="pb-1 text-[0.8125rem] font-medium text-ink-400">/ 100</span>
      <RiskBadge level={level} className="mb-1 ml-1" />
    </div>
  );
}
