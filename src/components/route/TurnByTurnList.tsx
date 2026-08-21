import type { RouteGuide } from '@/types';
import { turnMeta, type TurnShape } from '@/lib/routing/turn';
import { formatDistance, formatDuration } from '@/lib/utils/format';

/**
 * 턴바이턴 길 안내.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 * 지도 위의 선은 "어디로 가는지"는 보여주지만 "여기서 무엇을 해야 하는지"는
 * 알려주지 않는다. 걷는 사람은 화면을 계속 보고 있지 않고, 갈림길에서 한 번 본다.
 * 그 순간 필요한 건 폴리라인이 아니라 '좌회전'이라는 한 마디다.
 *
 * ── 어디서 온 값인가 ────────────────────────────────────
 * 전부 TMAP 보행자 경로 응답에 이미 들어 있던 값이다. 지금까지는 좌표만 쓰고
 * 버리던 회전정보(turnType)·구간설명(description)·도로명을 그대로 옮겼다.
 * 우리가 지어낸 문장은 하나도 없다 — 안내 지점 없이 도로만 이어지는 구간에
 * 붙이는 '계속 직진'만 예외이고, 그건 continuation 으로 구분해 둔다.
 *
 * 격자 근사 경로에는 실제 도로가 없어 안내를 만들 수 없다. 그때는 이 컴포넌트
 * 대신 안내가 왜 없는지를 설명한다.
 */
export function TurnByTurnList({
  guides,
  engine,
}: {
  guides: RouteGuide[];
  engine: 'tmap' | 'grid';
}) {
  if (guides.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[0.78125rem] font-semibold text-ink-900">길 안내</p>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-500">
          {engine === 'grid'
            ? '지금 보고 있는 경로는 실제 도로망이 아니라 격자 위에서 계산한 근사 경로라, 회전 안내를 만들 수 없습니다. 없는 안내를 지어내면 그대로 걸을 수 없기 때문에 표시하지 않습니다.'
            : '이 경로에는 안내 지점이 없습니다.'}
        </p>
      </div>
    );
  }

  const totalM = guides.reduce((sum, g) => sum + g.distanceM, 0);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.78125rem] font-semibold text-ink-900">
          길 안내 {guides.length}단계
        </p>
        <p className="tabular text-[0.6875rem] text-ink-400">
          합계 {formatDistance(totalM)}
        </p>
      </div>

      <ol className="mt-2.5 max-h-[420px] space-y-0.5 overflow-y-auto pr-0.5">
        {guides.map((guide, i) => {
          const meta = turnMeta(guide.turnType, guide.description);
          const isEnd = guide.turnType === 201;

          return (
            <li
              key={`${i}-${guide.coord[0]}-${guide.coord[1]}`}
              className="flex gap-2.5 rounded-lg px-1.5 py-2 hover:bg-surface-sunken"
            >
              <span className="flex w-5 shrink-0 justify-center pt-0.5">
                <span className="tabular text-[0.6875rem] font-semibold text-ink-300">
                  {i + 1}
                </span>
              </span>

              <TurnIcon shape={meta.shape} />

              <div className="min-w-0 flex-1">
                <p className="text-[0.78125rem] leading-snug font-medium text-ink-900">
                  {guide.description}
                </p>
                {/*
                  '계속 직진'은 도로명이 문구에 들어 있지 않아 따로 붙여 준다.
                  TMAP 문구에는 이미 도로명이 들어 있어 중복해 쓰지 않는다.
                */}
                {guide.continuation && guide.roadName && (
                  <p className="mt-0.5 text-[0.6875rem] text-ink-400">
                    {guide.roadName}
                  </p>
                )}
              </div>

              {!isEnd && guide.distanceM > 0 && (
                <div className="shrink-0 text-right">
                  <p className="tabular text-[0.71875rem] font-semibold text-ink-700">
                    {formatDistance(guide.distanceM)}
                  </p>
                  {guide.durationSec >= 60 && (
                    <p className="tabular text-[0.625rem] text-ink-400">
                      {formatDuration(guide.durationSec)}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-400">
        회전 안내와 도로명은 TMAP 보행자 경로 응답을 그대로 옮긴 것입니다. 실제
        현장의 공사·통제 상황은 반영되지 않습니다.
      </p>
    </div>
  );
}

/**
 * 회전 아이콘.
 *
 * 문자만 있으면 목록을 훑을 때 눈이 걸리는 지점이 없다. 방향은 그림이
 * 글자보다 빠르게 읽힌다 — 특히 걸으면서 흘긋 볼 때.
 */
function TurnIcon({ shape }: { shape: TurnShape }) {
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const tone =
    shape === 'start'
      ? 'text-brand-600'
      : shape === 'goal'
        ? 'text-risk-low'
        : shape === 'crosswalk'
          ? 'text-risk-moderate'
          : 'text-ink-400';

  return (
    <span className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center ${tone}`}>
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        {shape === 'straight' && <path d="M8 13.5V3M8 3 4.8 6.2M8 3l3.2 3.2" {...stroke} />}
        {shape === 'left' && (
          <path d="M11.5 13.5V7.5a2.5 2.5 0 0 0-2.5-2.5H4M4 5l3-3M4 5l3 3" {...stroke} />
        )}
        {shape === 'right' && (
          <path d="M4.5 13.5V7.5A2.5 2.5 0 0 1 7 5h5M12 5 9 2M12 5 9 8" {...stroke} />
        )}
        {shape === 'uturn' && (
          <path d="M4.5 13.5V6.5a3 3 0 0 1 6 0v7M10.5 13.5l-2-2M10.5 13.5l2-2" {...stroke} />
        )}
        {shape === 'crosswalk' && (
          <path d="M3 4v8M6.3 4v8M9.7 4v8M13 4v8" {...stroke} />
        )}
        {shape === 'stairs' && (
          <path d="M2.5 13h3.5V9.5h3.5V6H13V2.5" {...stroke} />
        )}
        {shape === 'slope' && <path d="M2.5 13h11M2.5 13 13 4" {...stroke} />}
        {shape === 'elevator' && (
          <path d="M3.5 2.5h9v11h-9zM8 2.5v11M5.7 6.5 6.9 5l1.2 1.5" {...stroke} />
        )}
        {shape === 'bridge' && (
          <path d="M2 11c3-5 9-5 12 0M2 13.5v-4M14 13.5v-4" {...stroke} />
        )}
        {shape === 'underpass' && (
          <path d="M2 5c3 5 9 5 12 0M2 2.5v4M14 2.5v4M2 13h12" {...stroke} />
        )}
        {shape === 'start' && (
          <>
            <circle cx="8" cy="8" r="4.5" {...stroke} />
            <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
          </>
        )}
        {shape === 'goal' && (
          <path d="M4.5 14V3h7l-1.6 2.6L11.5 8H4.5" {...stroke} />
        )}
      </svg>
    </span>
  );
}
