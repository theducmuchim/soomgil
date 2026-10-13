'use client';

import { RISK_LEVELS } from '@/config/indicators';
import { levelFromScore } from '@/lib/risk/score';
import { scoreTextColor } from '@/lib/risk/color';
import { formatDelta } from '@/lib/utils/format';

interface TooltipPayloadItem {
  payload: Record<string, unknown>;
}

/**
 * 차트 공통 툴팁.
 *
 * 값만 띄우지 않고 등급과 주요 요인을 함께 준다.
 * 숫자 하나만 보여주는 툴팁은 이미 화면에 있는 정보를 반복할 뿐이다.
 */
export function ChartTooltip({
  active,
  payload,
  kind,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  kind: 'district' | 'hourly';
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  const score = Number(d.score);
  const level = RISK_LEVELS[levelFromScore(score)];

  return (
    <div className="floating rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-[0.8125rem] font-bold text-ink-900">
        {kind === 'district' ? String(d.name) : `${String(d.hour)}시`}
      </p>

      <p className="tabular mt-1 flex items-baseline gap-1.5">
        <span className="text-[1rem] font-bold" style={{ color: scoreTextColor(score) }}>
          {Math.round(score)}
        </span>
        <span className="text-[0.75rem] font-semibold" style={{ color: level.color }}>
          {level.label}
        </span>
      </p>

      {kind === 'district' && (
        <p className="mt-1.5 border-t border-line pt-1.5 text-[0.75rem] leading-relaxed text-ink-500">
          주요 요인 {String(d.dominant)}
          <br />
          보정 전 {String(d.baseScore)} · 대기정체{' '}
          {formatDelta(Number(d.deltaPct), 1)}
        </p>
      )}

      {kind === 'hourly' && Boolean(d.isNow) && (
        <p className="mt-1.5 border-t border-line pt-1.5 text-[0.75rem] text-brand-600">
          현재 시각
        </p>
      )}
    </div>
  );
}
