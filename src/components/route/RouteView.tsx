'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { AreaRisk, RouteOption, RouteResult } from '@/types';
import { MapSkeleton } from '@/components/map';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { scoreColor } from '@/lib/risk/color';
import { formatDelta, formatDistance, formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function RouteView({
  result,
  dongRisks,
}: {
  result: RouteResult;
  dongRisks: AreaRisk[];
}) {
  // 기본 선택은 '가장 안전한 길' — 이 서비스가 존재하는 이유이므로 먼저 보여준다
  const [selectedId, setSelectedId] = useState(
    result.options.find((o) => o.kind === 'safest')?.id ?? result.options[0]?.id ?? '',
  );

  const selected = result.options.find((o) => o.id === selectedId) ?? result.options[0];

  if (!selected) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-[14px] font-semibold text-ink-900">
          경로를 찾지 못했습니다
        </p>
        <p className="mt-2 text-[13px] text-ink-500">
          출발지나 목적지가 대전 경계 밖일 수 있습니다. 다른 지점을 선택해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      <div className="order-2 h-[46vh] min-h-[320px] overflow-hidden rounded-2xl border border-line lg:order-1 lg:h-[560px]">
        <RouteMap result={result} dongRisks={dongRisks} selectedRouteId={selectedId} />
      </div>

      <div className="order-1 flex flex-col gap-3 lg:order-2">
        <ul className="flex flex-col gap-2.5">
          {result.options.map((option) => (
            <li key={option.id}>
              <RouteOptionCard
                option={option}
                selected={option.id === selectedId}
                onSelect={() => setSelectedId(option.id)}
              />
            </li>
          ))}
        </ul>

        <SegmentList option={selected} />
      </div>
    </div>
  );
}

function RouteOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: RouteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = scoreColor(option.exposureScore);
  const isBaseline = option.kind === 'fastest';
  const improved = option.exposureDeltaPct < -0.5;

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-colors',
        selected
          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
          : 'border-line bg-surface hover:border-brand-200 hover:bg-surface-sunken',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14.5px] font-bold text-ink-900">{option.label}</p>
          <p className="tabular mt-1 text-[12.5px] text-ink-500">
            {formatDuration(option.durationSec)} · {formatDistance(option.distanceM)}
          </p>
        </div>
        <RiskBadge level={option.level} size="sm" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-ink-400">노출 점수</p>
          <p className="tabular text-[24px] leading-none font-bold" style={{ color }}>
            {Math.round(option.exposureScore)}
          </p>
        </div>

        {isBaseline ? (
          <span className="rounded-md bg-surface-sunken px-2 py-1 text-[11px] font-medium text-ink-400">
            비교 기준
          </span>
        ) : (
          <span
            className={cn(
              'rounded-md px-2 py-1 text-[12px] font-bold',
              improved
                ? 'bg-risk-low/12 text-risk-low'
                : 'bg-surface-sunken text-ink-400',
            )}
          >
            추천 대비 {formatDelta(option.exposureDeltaPct, 1)}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * 구간 목록.
 *
 * 경로 위험도를 한 숫자로만 주면 "왜 그런지"를 알 수 없다.
 * 어느 동을 몇 분 지나가고 그 구간이 얼마나 나쁜지를 펼쳐 보여준다.
 */
function SegmentList({ option }: { option: RouteOption }) {
  const worst = [...option.segments].sort(
    (a, b) => b.effectiveScore - a.effectiveScore,
  )[0];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-ink-900">
          지나가는 구간 {option.segments.length}곳
        </p>
        {worst && (
          <p className="text-[11px] text-ink-400">
            최고 {worst.areaName} {Math.round(worst.effectiveScore)}
          </p>
        )}
      </div>

      <ul className="mt-2.5 max-h-[280px] space-y-0.5 overflow-y-auto">
        {option.segments.map((segment, i) => {
          const windAdjusted = segment.effectiveScore - segment.areaScore;
          return (
            <li
              key={`${segment.areaId}-${i}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: scoreColor(segment.effectiveScore) }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-[12.5px] font-medium text-ink-900">
                {segment.areaName}
              </span>
              <span className="tabular shrink-0 text-[11.5px] text-ink-400">
                {formatDuration(segment.durationSec)}
              </span>
              <span className="tabular w-11 shrink-0 text-right text-[12.5px] font-bold text-ink-700">
                {Math.round(segment.effectiveScore)}
                {windAdjusted > 0.5 && (
                  <span
                    className="ml-0.5 text-[9px] text-risk-high"
                    title={`풍향 보정 +${windAdjusted.toFixed(1)}`}
                  >
                    ▲
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
        <span className="text-risk-high">▲</span> 표시는 바람이 불어오는 쪽에 더 나쁜
        지역이 있어 실제 노출이 그 지역 값보다 높게 잡힌 구간입니다.
      </p>
    </div>
  );
}
