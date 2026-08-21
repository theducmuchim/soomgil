'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Season } from '@/types';
import { SEASONS, SEASON_ORDER } from '@/config/seasons';
import { Container } from '@/components/layout/Container';
import { cn } from '@/lib/utils/cn';

/**
 * 계절 보기 전환.
 *
 * 계절이 바뀌면 핵심 위험 지표가 통째로 달라지는 게 이 서비스의 핵심이라,
 * 사용자가 다른 계절 화면을 직접 눌러 볼 수 있게 한다.
 * (예: 지금은 여름이지만 봄에 꽃가루가 어떻게 나오는지 미리 확인)
 *
 * 상태는 URL 쿼리(?season=)에 둔다. 그래야
 *   - 특정 계절 화면을 그대로 링크로 공유할 수 있고
 *   - 서버에서 한 번에 계산해 내려줄 수 있으며
 *   - 페이지를 옮겨 다녀도 선택이 유지된다
 *
 * ── 실데이터 모드에서의 표시 ─────────────────────────────
 * 기상청·에어코리아가 주는 값은 **오늘** 것뿐이다. 8월에 겨울을 눌러도
 * 지난겨울 관측값이 오지는 않으므로, 오늘이 아닌 계절은 예시 시나리오로 채운다
 * (lib/api/index.ts 의 preview).
 *
 * 그래서 오늘이 아닌 계절을 보는 동안에는 화면 전체가 예시라는 사실을 이 자리에서
 * 분명히 밝힌다. 실데이터와 예시가 섞이는 것 자체는 문제가 아니다.
 * 어느 쪽인지 구분되지 않는 것이 문제다.
 */

/** 계절에 따라 내용이 달라지는 화면들 */
const SEASON_AWARE = ['/', '/route', '/risk-map', '/layers', '/stats', '/mypage'];

export function SeasonToggle({
  /** 지금 실제 계절 — 아무것도 선택하지 않았을 때의 기본값 */
  currentSeason,
}: {
  currentSeason: Season;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!SEASON_AWARE.includes(pathname)) return null;

  const selected = (searchParams.get('season') as Season) ?? currentSeason;
  const active = SEASON_ORDER.includes(selected) ? selected : currentSeason;

  /** 오늘이 아닌 계절 = 실제 관측값이 없는 계절 */
  const isPreview = active !== currentSeason;

  const select = (season: Season) => {
    const params = new URLSearchParams(searchParams.toString());
    if (season === currentSeason) {
      // 실제 계절로 돌아올 때는 쿼리를 지워 기본 주소를 유지한다
      params.delete('season');
    } else {
      params.set('season', season);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div
      className={cn(
        'border-b',
        isPreview
          ? 'border-risk-moderate/45 bg-risk-moderate/10'
          : 'border-line bg-surface-sunken',
      )}
    >
      <Container size="wide">
        <div className="flex flex-col gap-2 py-2.5 lg:flex-row lg:items-center lg:gap-3">
          {/*
            버튼 줄만 가로 스크롤한다.
            배지를 이 안에 두면 좁은 화면에서 오른쪽으로 밀려 나가 보이지 않는다 —
            "예시 데이터"는 스크롤해야 보이면 안 되는 정보라 스크롤 영역 밖에 둔다.
          */}
          <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
            <span
              className={cn(
                'shrink-0 text-[12px] font-semibold',
                isPreview ? 'text-ink-500' : 'text-ink-400',
              )}
            >
              계절 보기
            </span>

            <div
              className="flex shrink-0 items-center gap-1"
              role="group"
              aria-label="계절 선택"
            >
              {SEASON_ORDER.map((season) => {
                const isActive = season === active;
                const isNow = season === currentSeason;
                return (
                  <button
                    key={season}
                    onClick={() => select(season)}
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-ink-500 hover:bg-surface hover:text-ink-900',
                    )}
                  >
                    {SEASONS[season].label}
                    {isNow && (
                      <span
                        className={cn(
                          'rounded px-1 py-px text-[10px] font-medium',
                          isActive ? 'bg-white/20 text-white' : 'bg-line text-ink-400',
                        )}
                      >
                        지금
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isPreview ? (
            <p
              role="status"
              className="flex items-start gap-2 text-[11.5px] leading-snug lg:ml-auto lg:shrink-0 lg:items-center lg:pl-4"
            >
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-risk-moderate/50 bg-surface px-2 py-0.5 text-[11px] font-bold text-ink-900">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3 text-risk-moderate"
                  aria-hidden="true"
                >
                  <path
                    d="M8 1.8 15 14H1L8 1.8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6v3.4M8 11.6v.1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                예시 데이터
              </span>
              <span className="text-ink-500">
                {SEASONS[active].label}은 오늘이 아니라 실제 관측값이 없습니다. 이 화면의
                수치는 전부 예시입니다.
              </span>
            </p>
          ) : (
            <p className="ml-auto hidden shrink-0 pl-4 text-[11.5px] text-ink-400 lg:block">
              {SEASONS[active].headline}
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
