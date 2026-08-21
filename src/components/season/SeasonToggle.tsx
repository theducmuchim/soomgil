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
 * (예: 지금은 겨울이지만 봄에 꽃가루가 어떻게 나오는지 미리 확인)
 *
 * 상태는 URL 쿼리(?season=)에 둔다. 그래야
 *   - 특정 계절 화면을 그대로 링크로 공유할 수 있고
 *   - 서버에서 한 번에 계산해 내려줄 수 있으며
 *   - 페이지를 옮겨 다녀도 선택이 유지된다
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
    <div className="border-b border-line bg-surface-sunken">
      <Container size="wide">
        <div className="flex items-center gap-3 overflow-x-auto py-2.5">
          <span className="shrink-0 text-[12px] font-semibold text-ink-400">
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

          <p className="ml-auto hidden shrink-0 pl-4 text-[11.5px] text-ink-400 lg:block">
            {SEASONS[active].headline}
          </p>
        </div>
      </Container>
    </div>
  );
}
