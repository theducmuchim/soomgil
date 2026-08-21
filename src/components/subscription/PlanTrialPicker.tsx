'use client';

import Link from 'next/link';
import { usePlan } from '@/lib/subscription/usePlan';
import { PLANS, PLAN_ORDER, formatPrice } from '@/config/plans';
import { cn } from '@/lib/utils/cn';

/**
 * 요금제 체험 전환.
 *
 * 실제 결제가 없으므로 이 선택이 구독 상태를 대신한다.
 * 고르면 광고·경로 비교·즐겨찾기 한도·알림이 즉시 바뀐다.
 *
 * "체험 모드"임을 반드시 알린다. 이건 실제 상품이 아니라 구독하면 화면이
 * 어떻게 달라지는지 보여주는 장치라, 사용자가 결제한 것으로 오해하면 안 된다.
 *
 * 요금제가 둘일 때는 켜고 끄는 스위치였지만 넷이 되면서 목록으로 바꿨다.
 * 스위치는 상태가 두 개일 때만 정직한 표현이다.
 */
export function PlanTrialPicker({
  /** 요금제 페이지에서 쓸 때는 카드 테두리 없이 */
  bare = false,
}: {
  bare?: boolean;
}) {
  const [plan, setPlan] = usePlan();
  const current = PLANS[plan];

  const body = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.9375rem] font-bold text-ink-900">요금제 체험</h2>
        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
          지금 {current.name}
        </span>
      </div>

      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
        {current.tagline}
      </p>

      <div
        className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
        role="radiogroup"
        aria-label="체험할 요금제"
      >
        {PLAN_ORDER.map((id) => {
          const option = PLANS[id];
          const active = id === plan;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={active}
              onClick={() => setPlan(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink-700 hover:bg-surface-sunken',
              )}
            >
              <span className="text-[0.8125rem] font-bold">{option.name}</span>
              <span
                className={cn(
                  'tabular text-[0.6875rem]',
                  active ? 'text-white/75' : 'text-ink-400',
                )}
              >
                {option.monthlyPrice === 0
                  ? '0원'
                  : `${option.monthlyPrice.toLocaleString('ko-KR')}원`}
              </span>
            </button>
          );
        })}
      </div>

      {/* 결제한 것으로 오해하면 안 되는 부분이라 눈에 보이게 둔다 */}
      <p className="mt-4 rounded-lg bg-surface-sunken px-3.5 py-2.5 text-[0.71875rem] leading-relaxed text-ink-500">
        <strong className="font-semibold text-ink-700">체험 모드입니다.</strong> 실제
        결제는 이루어지지 않으며 요금이 청구되지 않습니다. 구독 기능이 어떻게 동작하는지
        보여주기 위한 것이고, 상태는 이 브라우저에만 저장됩니다. 표시된 금액
        ({formatPrice(PLANS.premium.monthlyPrice)} 등)은 예시입니다.
      </p>

      {!bare && (
        <Link
          href="/pricing"
          className="mt-3 inline-block text-[0.78125rem] font-semibold text-brand-600 hover:text-brand-700"
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
        plan === 'free' ? 'border-line bg-surface' : 'border-brand-300 bg-brand-50/50',
      )}
    >
      {body}
    </section>
  );
}
