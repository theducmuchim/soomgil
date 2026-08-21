'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { AreaRisk, RouteOption, RouteResult } from '@/types';
import Link from 'next/link';
import { MapSkeleton } from '@/components/map';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { scoreColor } from '@/lib/risk/color';
import { usePlanCapabilities } from '@/lib/subscription/usePlan';
import { TurnByTurnList } from '@/components/route/TurnByTurnList';
import { INDICATORS } from '@/config/indicators';
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
  const { routeCompare } = usePlanCapabilities();

  /*
   * 경로 비교가 열리지 않은 요금제(무료·라이트)는 추천 경로 하나만 본다.
   *
   * 계산은 어차피 전부 끝난 상태다(경로 3안 모두 계산됨). 여기서 나누는 건
   * "얼마나 보여줄 것인가"뿐이다. 그래서 요금제를 바꾸는 순간 다시 계산하지
   * 않고 즉시 나머지가 드러난다.
   */
  const visibleOptions = routeCompare
    ? result.options
    : result.options.filter((o) => o.kind === 'fastest').slice(0, 1);

  const hiddenCount = result.options.length - visibleOptions.length;

  // 기본 선택은 '가장 안전한 길' — 이 서비스가 존재하는 이유이므로 먼저 보여준다
  const [selectedId, setSelectedId] = useState(
    result.options.find((o) => o.kind === 'safest')?.id ?? result.options[0]?.id ?? '',
  );

  // 무료로 돌아왔을 때 숨겨진 경로가 선택된 채로 남지 않게 한다
  const selected =
    visibleOptions.find((o) => o.id === selectedId) ?? visibleOptions[0];

  if (!selected) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-[0.875rem] font-semibold text-ink-900">
          경로를 찾지 못했습니다
        </p>
        <p className="mt-2 text-[0.8125rem] text-ink-500">
          출발지나 목적지가 대전 경계 밖일 수 있습니다. 다른 지점을 선택해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      <div className="order-2 h-[46vh] min-h-[320px] overflow-hidden rounded-2xl border border-line lg:order-1 lg:h-[560px]">
        <RouteMap
          result={routeCompare ? result : { ...result, options: visibleOptions }}
          dongRisks={dongRisks}
          selectedRouteId={selected.id}
        />
      </div>

      <div className="order-1 flex flex-col gap-3 lg:order-2">
        <ul className="flex flex-col gap-2.5">
          {visibleOptions.map((option) => (
            <li key={option.id}>
              <RouteOptionCard
                option={option}
                selected={option.id === selected.id}
                onSelect={() => setSelectedId(option.id)}
              />
            </li>
          ))}
        </ul>

        {!routeCompare && hiddenCount > 0 && <RouteUpsell hiddenCount={hiddenCount} />}

        <RouteDetailTabs option={selected} engine={result.engine} />

        {routeCompare && <ExposureBreakdown option={selected} dongRisks={dongRisks} />}
      </div>
    </div>
  );
}

/**
 * 경로 상세 — 구간 위험도 / 길 안내.
 *
 * 두 목록을 위아래로 쌓으면 오른쪽 열이 지나치게 길어져, 지도와 나란히 보기가
 * 어려워진다. 둘은 같은 경로를 다른 관점(어디가 나쁜가 / 어떻게 가는가)에서
 * 보는 것이라 탭으로 바꿔 가며 보는 편이 맞다.
 *
 * 기본 탭은 구간 위험도다. 길 안내는 다른 지도 앱에서도 볼 수 있지만
 * 구간 위험도는 이 서비스에만 있고, 그게 경로를 고르는 근거이기 때문이다.
 */
function RouteDetailTabs({
  option,
  engine,
}: {
  option: RouteOption;
  engine: 'tmap' | 'grid';
}) {
  const [tab, setTab] = useState<'risk' | 'turns'>('risk');

  const tabs = [
    { id: 'risk' as const, label: '구간 위험도', count: option.segments.length },
    { id: 'turns' as const, label: '길 안내', count: option.guides.length },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex items-center gap-1 rounded-lg bg-surface-sunken p-1"
        role="tablist"
        aria-label="경로 상세"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-[0.78125rem] font-semibold transition-colors',
              tab === t.id
                ? 'bg-surface text-ink-900 shadow-sm'
                : 'text-ink-400 hover:text-ink-700',
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className="tabular ml-1.5 font-medium text-ink-400">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'risk' ? (
        <SegmentList option={option} />
      ) : (
        <TurnByTurnList guides={option.guides} engine={engine} />
      )}
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
          <p className="text-[0.90625rem] font-bold text-ink-900">{option.label}</p>
          <p className="tabular mt-1 text-[0.78125rem] text-ink-500">
            {formatDuration(option.durationSec)} · {formatDistance(option.distanceM)}
          </p>
        </div>
        <RiskBadge level={option.level} size="sm" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] text-ink-400">노출 점수</p>
          <p className="tabular text-[1.5rem] leading-none font-bold" style={{ color }}>
            {Math.round(option.exposureScore)}
          </p>
        </div>

        {isBaseline ? (
          <span className="rounded-md bg-surface-sunken px-2 py-1 text-[0.6875rem] font-medium text-ink-400">
            비교 기준
          </span>
        ) : (
          <span
            className={cn(
              'rounded-md px-2 py-1 text-[0.75rem] font-bold',
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
        <p className="text-[0.78125rem] font-semibold text-ink-900">
          지나가는 구간 {option.segments.length}곳
        </p>
        {worst && (
          <p className="text-[0.6875rem] text-ink-400">
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
              <span className="flex-1 truncate text-[0.78125rem] font-medium text-ink-900">
                {segment.areaName}
              </span>
              <span className="tabular shrink-0 text-[0.71875rem] text-ink-400">
                {formatDuration(segment.durationSec)}
              </span>
              <span className="tabular w-11 shrink-0 text-right text-[0.78125rem] font-bold text-ink-700">
                {Math.round(segment.effectiveScore)}
                {windAdjusted > 0.5 && (
                  <span
                    className="ml-0.5 text-[0.5625rem] text-risk-high"
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

      <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-400">
        <span className="text-risk-high">▲</span> 표시는 바람이 불어오는 쪽에 더 나쁜
        지역이 있어 실제 노출이 그 지역 값보다 높게 잡힌 구간입니다.
      </p>
    </div>
  );
}

/**
 * 무료 플랜에서 가려진 경로안 안내.
 *
 * "잠김"만 걸어두지 않고 몇 개가 더 있는지 알려준다. 무엇이 가려졌는지 모르면
 * 구독할 이유도 알 수 없다. 다만 수치는 노출하지 않는다 — 그게 유료 부분이다.
 */
function RouteUpsell({ hiddenCount }: { hiddenCount: number }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
      <p className="text-[0.8125rem] font-bold text-brand-700">
        경로 {hiddenCount}개를 더 계산했습니다
      </p>
      <p className="mt-1.5 text-[0.78125rem] leading-relaxed text-ink-600">
        노출량이 더 적은 경로와 더 빠른 경로를 이미 찾아 두었습니다. 프리미엄에서
        세 경로를 나란히 비교하고, 구간별 위험 요인까지 볼 수 있습니다.
      </p>
      <Link
        href="/pricing"
        className="mt-3 inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-[0.78125rem] font-semibold text-white transition-colors hover:bg-brand-700"
      >
        요금제 보기
      </Link>
    </div>
  );
}

/**
 * 구간 위험 요인 (프리미엄).
 *
 * 경로에서 가장 노출이 큰 구간이 어느 지표 때문에 나쁜지 펼친다.
 * 값은 이미 계산돼 있는 것(AreaRisk.breakdown.contributions)을 그대로 쓴다.
 * "왜 이 길이 나쁜가"에 답하는 부분이라 유료로 둔다.
 */
function ExposureBreakdown({
  option,
  dongRisks,
}: {
  option: RouteOption;
  dongRisks: AreaRisk[];
}) {
  const worst = [...option.segments].sort(
    (a, b) => b.effectiveScore - a.effectiveScore,
  )[0];
  if (!worst) return null;

  const area = dongRisks.find((d) => d.areaId === worst.areaId);
  if (!area || area.breakdown.contributions.length === 0) return null;

  const maxPoints = Math.max(...area.breakdown.contributions.map((c) => c.points), 1);

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.78125rem] font-semibold text-brand-700">구간 위험 요인</p>
        <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
          프리미엄
        </span>
      </div>

      <p className="mt-1.5 text-[0.71875rem] leading-relaxed text-ink-500">
        이 경로에서 노출이 가장 큰 <strong className="font-semibold">{worst.areaName}</strong>{' '}
        구간을 무엇이 끌어올렸는지 봅니다.
      </p>

      <ul className="mt-3 space-y-2.5">
        {area.breakdown.contributions.map((c) => {
          const meta = INDICATORS[c.id];
          return (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
                <span className="font-medium text-ink-700">
                  {meta.shortLabel}
                  <span className="ml-1.5 text-ink-400">
                    비중 {Math.round(c.weight * 100)}%
                  </span>
                </span>
                <span className="tabular shrink-0 font-semibold text-ink-700">
                  {c.points}점
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
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

      <p className="mt-3 border-t border-brand-200/70 pt-2.5 text-[0.6875rem] leading-relaxed text-ink-500">
        보정 전 {area.breakdown.baseScore}점에 대기정체 보정{' '}
        {formatDelta(area.breakdown.stagnationDeltaPct, 1)}를 적용해 최종{' '}
        {area.breakdown.score}점입니다.
      </p>
    </div>
  );
}
