'use client';

import Link from 'next/link';
import type { RouteOption } from '@/types';
import { usePremium } from '@/lib/subscription/usePremium';
import { formatDelta } from '@/lib/utils/format';

/**
 * 경로 결과 한 줄 요약.
 *
 * 무료 플랜에서는 안전 경로를 화면에 띄우지 않으므로, "가장 안전한 길로 가면
 * -9.8% 줄어듭니다"라고만 쓰면 볼 수 없는 것을 가리키게 된다.
 *
 * 그렇다고 개선폭을 숨기지는 않는다. 얼마나 나아지는지 알아야 구독할지 판단할 수
 * 있고, 숫자를 가린 채 "더 좋은 경로가 있다"고만 하면 근거 없는 광고가 된다.
 * 수치는 보여주되 프리미엄에서 볼 수 있다는 점을 분명히 한다.
 */
export function RouteSummaryMessage({
  safest,
}: {
  /** 가장 안전한 경로 (없으면 개선 여지가 없다는 뜻) */
  safest: Pick<RouteOption, 'label' | 'exposureDeltaPct'> | null;
}) {
  const [isPremium] = usePremium();

  if (!safest || safest.exposureDeltaPct >= -0.5) {
    return (
      <p className="text-[14px] leading-relaxed text-ink-900">
        지금은 경로별 노출량 차이가 크지 않습니다. 추천 경로로 가셔도 됩니다.
      </p>
    );
  }

  if (isPremium) {
    return (
      <p className="text-[14px] leading-relaxed text-ink-900">
        <strong className="font-bold">{safest.label}</strong>로 가면 추천 경로보다
        노출량이{' '}
        <strong className="font-bold text-risk-low">
          {formatDelta(safest.exposureDeltaPct, 1)}
        </strong>{' '}
        줄어듭니다.
      </p>
    );
  }

  return (
    <p className="text-[14px] leading-relaxed text-ink-900">
      노출량이{' '}
      <strong className="font-bold text-risk-low">
        {formatDelta(safest.exposureDeltaPct, 1)}
      </strong>{' '}
      더 적은 경로를 찾았습니다.{' '}
      <Link
        href="/pricing"
        className="font-semibold text-brand-600 underline underline-offset-2"
      >
        프리미엄
      </Link>
      에서 세 경로를 나란히 비교할 수 있습니다.
    </p>
  );
}
