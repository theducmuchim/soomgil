'use client';

import { useStored } from '@/lib/utils/local-store';
import { PLANS, isPlanId, type PlanCapabilities, type PlanId } from '@/config/plans';

/**
 * 지금 요금제.
 *
 * ── 지금은 브라우저에만 저장된다 ────────────────────────
 * 실제 결제가 없으므로 서버에 구독 상태가 없다. 마이페이지와 요금제 화면의
 * 체험 전환이 이 값을 바꾼다. 다른 기기에서는 이어지지 않고, 저장소를 비우면
 * 무료로 돌아간다.
 *
 * ── 나중에 실제 결제를 붙일 때 ──────────────────────────
 * 이 훅의 내부만 서버 구독 상태 조회로 바꾸면 된다.
 * 게이팅이 걸린 화면들은 usePlanCapabilities()만 보고 있으므로 손대지 않아도 된다.
 *
 *   export function usePlan() {
 *     const { data } = useSWR('/api/subscription', fetcher);
 *     return [data?.planId ?? 'free', ...] as const;
 *   }
 *
 * useStored 는 useSyncExternalStore 기반이라 서버 렌더에서는 항상 무료가 나오고,
 * 하이드레이션 이후 실제 값으로 바뀐다. 그래서 hydration 불일치가 없다.
 */

const KEY = 'soomgil:plan';

/**
 * 요금제가 두 단계(무료/프리미엄)이던 시절의 저장 값.
 *
 * 이미 체험을 켜 둔 사람의 상태를 그냥 버리면, 앱을 다시 열었을 때 아무 설명 없이
 * 광고가 돌아오고 경로가 하나로 줄어든다. 그 사람 입장에서는 고장난 것으로 보인다.
 * 옛 키에 true 가 남아 있으면 프리미엄으로 이어받는다.
 */
const LEGACY_KEY = 'soomgil:premiumTrial';

export function usePlan(): [PlanId, (next: PlanId) => void] {
  const [stored, setStored] = useStored<unknown>(KEY, null);
  const [legacyPremium] = useStored<unknown>(LEGACY_KEY, null);

  const plan: PlanId = isPlanId(stored)
    ? stored
    : legacyPremium === true
      ? 'premium'
      : 'free';

  return [plan, (next) => setStored(next)];
}

/**
 * 지금 요금제가 여는 기능들.
 *
 * 화면은 요금제 이름이 아니라 이 값만 본다. 요금제가 늘어나도 게이팅 코드는
 * 그대로다 (config/plans.ts 참고).
 */
export function usePlanCapabilities(): PlanCapabilities {
  const [plan] = usePlan();
  return PLANS[plan].capabilities;
}
