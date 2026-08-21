'use client';

import Link from 'next/link';
import { usePremium } from '@/lib/subscription/usePremium';
import { PLANS, formatPrice } from '@/config/plans';
import { cn } from '@/lib/utils/cn';

/**
 * 프리미엄 체험 토글.
 *
 * 실제 결제가 없으므로 이 토글이 구독 상태를 대신한다.
 * 켜면 광고가 사라지고 경로 3안 비교와 즐겨찾기 제한 해제가 즉시 적용된다.
 *
 * "체험 모드"임을 반드시 알린다. 이건 실제 상품이 아니라 구독하면 화면이
 * 어떻게 달라지는지 보여주는 장치라, 사용자가 결제한 것으로 오해하면 안 된다.
 */
export function PremiumToggle({
  /** 요금제 페이지에서 쓸 때는 카드 테두리 없이 */
  bare = false,
}: {
  bare?: boolean;
}) {
  const [isPremium, setPremium] = usePremium();
  const plan = PLANS.premium;

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink-900">프리미엄 체험</h2>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isPremium ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-400',
              )}
            >
              {isPremium ? '켜짐' : '꺼짐'}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            {isPremium
              ? '광고가 사라지고, 경로 3안 비교와 관심 지역 제한 해제가 적용되어 있습니다.'
              : `${plan.tagline} 켜 보시면 화면이 어떻게 달라지는지 바로 확인할 수 있습니다.`}
          </p>
        </div>

        <button
          onClick={() => setPremium(!isPremium)}
          role="switch"
          aria-checked={isPremium}
          aria-label="프리미엄 체험"
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors',
            isPremium ? 'bg-brand-600' : 'bg-line-strong',
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              isPremium ? 'translate-x-6' : 'translate-x-1',
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* 결제한 것으로 오해하면 안 되는 부분이라 눈에 보이게 둔다 */}
      <p className="mt-4 rounded-lg bg-surface-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-500">
        <strong className="font-semibold text-ink-700">체험 모드입니다.</strong> 실제
        결제는 이루어지지 않으며 요금이 청구되지 않습니다. 구독 기능이 어떻게 동작하는지
        보여주기 위한 것이고, 상태는 이 브라우저에만 저장됩니다.{' '}
        {formatPrice(plan.monthlyPrice)}은 예시 금액입니다.
      </p>

      {!bare && (
        <Link
          href="/pricing"
          className="mt-3 inline-block text-[12.5px] font-semibold text-brand-600 hover:text-brand-700"
        >
          요금제 비교 보기
        </Link>
      )}
    </>
  );

  if (bare) return <div>{body}</div>;

  return (
    <section
      className={cn(
        'rounded-2xl border p-5 sm:p-6',
        isPremium ? 'border-brand-300 bg-brand-50/50' : 'border-line bg-surface',
      )}
    >
      {body}
    </section>
  );
}
