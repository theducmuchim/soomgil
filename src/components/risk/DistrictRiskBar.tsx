import Link from 'next/link';
import type { AreaRisk } from '@/types';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { scoreColor } from '@/lib/risk/color';
import { formatDelta } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * 자치구 한 곳의 위험도 막대.
 *
 * 색은 등급이 아니라 점수에서 뽑는다(scoreColor). 같은 '높음'이어도
 * 54점과 74점이 다른 색으로 보여야 어디가 더 나쁜지 알 수 있다.
 * 색만으로 구분되지 않도록 점수와 등급 라벨을 항상 함께 쓴다.
 */
export function DistrictRiskBar({
  area,
  /** 막대 길이 기준 — 목록 중 최고 점수 */
  maxScore = 100,
  href,
  showBreakdown = true,
}: {
  area: AreaRisk;
  maxScore?: number;
  href?: string;
  showBreakdown?: boolean;
}) {
  const color = scoreColor(area.score);
  const widthPct = Math.max(4, (area.score / Math.max(maxScore, 1)) * 100);
  const dominant = INDICATORS[area.dominantIndicator];
  const levelLabel = RISK_LEVELS[area.level].label;

  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.875rem] font-semibold text-ink-900">{area.areaName}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="tabular text-[1.0625rem] font-bold" style={{ color }}>
            {Math.round(area.score)}
          </span>
          <span className="text-[0.71875rem] font-medium text-ink-400">{levelLabel}</span>
        </span>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line/70"
        role="img"
        aria-label={`${area.areaName} 위험도 ${Math.round(area.score)}점, ${levelLabel}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
        />
      </div>

      {showBreakdown && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.71875rem] text-ink-400">
          <span>주요 요인 {dominant.shortLabel}</span>
          <span aria-hidden="true">·</span>
          <span>
            대기정체 {formatDelta(area.breakdown.stagnationDeltaPct, 1)}
          </span>
          <span aria-hidden="true">·</span>
          <span>바람 {area.wind.label} {area.wind.speed}m/s</span>
        </p>
      )}
    </>
  );

  if (!href) {
    return <div className="py-3">{inner}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-lg px-3 py-3 transition-colors',
        '-mx-3 hover:bg-surface-sunken',
      )}
    >
      {inner}
    </Link>
  );
}
