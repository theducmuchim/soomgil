'use client';

import { PLANS, PLAN_FEATURES, type PlanId } from '@/config/plans';
import { usePremium } from '@/lib/subscription/usePremium';
import { cn } from '@/lib/utils/cn';

/**
 * 요금제 비교.
 *
 * "구독하기" 자리에 실제 결제 대신 체험 토글을 둔다. 결제를 붙일 수 없는 상태에서
 * 눌리지 않는 버튼을 두면 심사에서 확인할 것이 없고, 눌리는 척하는 버튼을 두면
 * 사용자를 속이게 된다. 켜면 즉시 화면이 바뀌는 체험 버튼이 둘 다 피한다.
 */
export function PlanComparison() {
  const [isPremium, setPremium] = usePremium();

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard planId="free" active={!isPremium} onSelect={() => setPremium(false)} />
        <PlanCard planId="premium" active={isPremium} onSelect={() => setPremium(true)} />
      </div>

      {/* 비교표 */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <caption className="sr-only">무료와 프리미엄 요금제 기능 비교</caption>
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-900">
                기능
              </th>
              <th scope="col" className="w-[26%] py-3 pr-4 font-semibold text-ink-500">
                무료
              </th>
              <th scope="col" className="w-[30%] py-3 font-semibold text-brand-700">
                프리미엄
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature) => (
              <tr key={feature.label} className="border-b border-line/70">
                <th
                  scope="row"
                  className="py-3 pr-4 text-left font-medium text-ink-900"
                >
                  {feature.label}
                </th>
                <td className="py-3 pr-4 text-ink-500">
                  {feature.free === false ? (
                    <span className="text-ink-300">제공 안 함</span>
                  ) : (
                    feature.free
                  )}
                </td>
                <td
                  className={cn(
                    'py-3',
                    feature.highlight
                      ? 'font-semibold text-brand-700'
                      : 'text-ink-500',
                  )}
                >
                  {feature.premium}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 rounded-lg bg-surface-sunken px-4 py-3 text-[11.5px] leading-relaxed text-ink-500">
        <strong className="font-semibold text-ink-700">
          아직 실제 결제를 받지 않습니다.
        </strong>{' '}
        결제 연동에는 사업자등록이 필요해 지금은 붙이지 않았습니다. 위 버튼은 요금을
        청구하지 않고, 구독 시 화면이 어떻게 달라지는지 바로 확인할 수 있는 체험
        전환입니다. 표시된 금액은 예시입니다.
      </p>
    </div>
  );
}

function PlanCard({
  planId,
  active,
  onSelect,
}: {
  planId: PlanId;
  active: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[planId];
  const isPremium = planId === 'premium';

  const included = PLAN_FEATURES.filter((f) =>
    isPremium ? true : f.free !== false,
  ).slice(0, 5);

  return (
    <section
      className={cn(
        'relative flex flex-col rounded-2xl border p-5 sm:p-6',
        isPremium ? 'border-brand-300 bg-brand-50/40' : 'border-line bg-surface',
        active && 'ring-2 ring-brand-500',
      )}
    >
      {active && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          지금 사용 중
        </span>
      )}

      <h3
        className={cn(
          'text-[16px] font-bold',
          isPremium ? 'text-brand-700' : 'text-ink-900',
        )}
      >
        {plan.name}
      </h3>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[28px] leading-none font-bold text-ink-900">
          {plan.monthlyPrice === 0 ? '0원' : `${plan.monthlyPrice.toLocaleString('ko-KR')}원`}
        </span>
        {plan.monthlyPrice > 0 && (
          <span className="text-[12.5px] text-ink-400">/ 월</span>
        )}
      </p>

      <p className="mt-2.5 min-h-[2.6em] text-[13px] leading-relaxed text-ink-500">
        {plan.tagline}
      </p>

      <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4">
        {included.map((feature) => (
          <li key={feature.label} className="flex gap-2.5 text-[12.5px] text-ink-700">
            <svg
              viewBox="0 0 16 16"
              className={cn(
                'mt-0.5 h-3.5 w-3.5 shrink-0',
                isPremium ? 'text-brand-600' : 'text-ink-300',
              )}
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3.5 8.5l3 3 6-6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              {feature.label}
              {isPremium && feature.highlight && (
                <span className="ml-1 text-ink-400">— {feature.premium}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={active}
        className={cn(
          'mt-5 h-11 rounded-lg text-sm font-semibold transition-colors',
          active && 'cursor-default bg-surface-sunken text-ink-400',
          !active && isPremium && 'bg-brand-600 text-white hover:bg-brand-700',
          !active && !isPremium && 'border border-line-strong text-ink-700 hover:bg-surface-sunken',
        )}
      >
        {active ? '사용 중' : isPremium ? '체험해보기' : '무료로 전환'}
      </button>

      {isPremium && !active && (
        <p className="mt-2 text-center text-[11px] text-ink-400">
          결제 없이 바로 적용됩니다
        </p>
      )}
    </section>
  );
}
