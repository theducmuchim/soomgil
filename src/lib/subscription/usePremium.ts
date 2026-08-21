'use client';

import { useStored } from '@/lib/utils/local-store';

/**
 * 프리미엄 구독 여부.
 *
 * ── 지금은 브라우저에만 저장된다 ────────────────────────
 * 실제 결제가 없으므로 서버에 구독 상태가 없다. 마이페이지의 체험 토글이
 * 이 값을 켜고 끈다. 다른 기기에서는 이어지지 않고, 저장소를 비우면 사라진다.
 *
 * ── 나중에 실제 결제를 붙일 때 ──────────────────────────
 * 이 훅의 내부만 서버 구독 상태 조회로 바꾸면 된다.
 * 게이팅이 걸린 화면들(AdSlot, RouteView, MyPageSettings)은 이 훅만 보고 있으므로
 * 손대지 않아도 된다.
 *
 *   export function usePremium() {
 *     const { data } = useSWR('/api/subscription', fetcher);
 *     return [data?.active ?? false, ...] as const;
 *   }
 *
 * useStored 는 useSyncExternalStore 기반이라 서버 렌더에서는 항상 false가 나오고,
 * 하이드레이션 이후 실제 값으로 바뀐다. 그래서 hydration 불일치가 없다.
 */

const KEY = 'soomgil:premiumTrial';

export function usePremium(): [boolean, (next: boolean) => void] {
  const [value, setValue] = useStored<boolean>(KEY, false);
  return [value === true, setValue];
}
