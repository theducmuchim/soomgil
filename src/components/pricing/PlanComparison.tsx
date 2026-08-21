'use client';

import { PLANS, PLAN_FEATURES, PLAN_ORDER, type PlanId } from '@/config/plans';
import { usePlan } from '@/lib/subscription/usePlan';
import { cn } from '@/lib/utils/cn';

/**
 * 요금제 비교.
 *
 * "구독하기" 자리에 실제 결제 대신 체험 전환을 둔다. 결제를 붙일 수 없는 상태에서
 * 눌리지 않는 버튼을 두면 심사에서 확인할 것이 없고, 눌리는 척하는 버튼을 두면
 * 사용자를 속이게 된다. 누르면 즉시 화면이 바뀌는 체험 버튼이 둘 다 피한다.
 */
export function PlanComparison() {
  const [plan, setPlan] = usePlan();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => (
          <PlanCard
            key={id}
            planId={id}
            active={plan === id}
            onSelect={() => setPlan(id)}
          />
        ))}
      </div>

      {/*
        비교표.
        4열이라 좁은 화면에서는 접히지 않고 가로로 스크롤된다. 요금제 비교는
        같은 행을 좌우로 훑어야 의미가 있어서, 열을 쌓으면 오히려 읽기 어렵다.
      */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[0.8125rem]">
          <caption className="sr-only">요금제별 기능 비교</caption>
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-900">
                기능
              </th>
              {PLAN_ORDER.map((id) => (
                <th
                  key={id}
                  scope="col"
                  className={cn(
                    'w-[17%] py-3 pr-4 font-semibold',
                    PLANS[id].featured ? 'text-brand-700' : 'text-ink-500',
                  )}
                >
                  {PLANS[id].name}
                  {plan === id && (
                    <span className="ml-1.5 rounded bg-brand-600 px-1 py-px text-[0.625rem] font-semibold text-white">
                      사용 중
                    </span>
                  )}
                </th>
              ))}
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
                {PLAN_ORDER.map((id) => {
                  const value = feature.values[id];
                  return (
                    <td
                      key={id}
                      className={cn(
                        'py-3 pr-4',
                        value === false
                          ? 'text-ink-300'
                          : feature.highlight
                            ? 'font-medium text-ink-700'
                            : 'text-ink-500',
                      )}
                    >
                      {value === false ? '제공 안 함' : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 rounded-lg bg-surface-sunken px-4 py-3 text-[0.71875rem] leading-relaxed text-ink-500">
        <strong className="font-semibold text-ink-700">
          아직 실제 결제를 받지 않습니다.
        </strong>{' '}
        결제 연동에는 사업자등록이 필요해 지금은 붙이지 않았습니다. 위 버튼은 요금을
        청구하지 않고, 요금제를 바꾸면 화면이 어떻게 달라지는지 바로 확인할 수 있는
        체험 전환입니다. 표시된 금액은 예시입니다.
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
  const isPaid = plan.monthlyPrice > 0;

  /*
   * 카드에는 **무료보다 나아지는 것만** 적는다.
   *
   * 요금제가 갖는 항목을 전부 적으면 두 가지 문제가 생긴다.
   * 하나는 네 카드가 비슷해 보여 무엇을 더 주는지 읽어낼 수 없다는 것이고,
   * 다른 하나는 무료 카드에 '배너 광고 — 표시'가 체크 표시와 함께 올라간다는
   * 것이다. 광고가 뜨는 건 혜택이 아닌데 혜택처럼 읽힌다.
   *
   * 무료 카드는 비교 대상이 자기 자신이라 목록이 비고, 아래 문장으로 대신한다.
   */
  const included = PLAN_FEATURES.filter(
    (f) =>
      f.highlight &&
      f.values[planId] !== false &&
      f.values[planId] !== f.values.free,
  );

  return (
    <section
      className={cn(
        'relative flex flex-col rounded-2xl border p-5',
        plan.featured ? 'border-brand-300 bg-brand-50/40' : 'border-line bg-surface',
        active && 'ring-2 ring-brand-500',
      )}
    >
      {active ? (
        <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
          지금 사용 중
        </span>
      ) : (
        plan.featured && (
          <span className="absolute -top-2.5 left-5 rounded-full bg-brand-100 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-brand-700">
            가장 많이 고르는
          </span>
        )
      )}

      <h3
        className={cn(
          'text-[1rem] font-bold',
          plan.featured ? 'text-brand-700' : 'text-ink-900',
        )}
      >
        {plan.name}
      </h3>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[1.625rem] leading-none font-bold text-ink-900">
          {plan.monthlyPrice === 0
            ? '0원'
            : `${plan.monthlyPrice.toLocaleString('ko-KR')}원`}
        </span>
        {isPaid && <span className="text-[0.78125rem] text-ink-400">/ 월</span>}
      </p>

      <p className="mt-2.5 min-h-[3.4em] text-[0.8125rem] leading-relaxed text-ink-500">
        {plan.tagline}
      </p>

      <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4">
        {included.map((feature) => (
          <li key={feature.label} className="flex gap-2.5 text-[0.78125rem] text-ink-700">
            <svg
              viewBox="0 0 16 16"
              className={cn(
                'mt-0.5 h-3.5 w-3.5 shrink-0',
                plan.featured ? 'text-brand-600' : 'text-ink-300',
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
              <span className="ml-1 text-ink-400">— {feature.values[planId]}</span>
            </span>
          </li>
        ))}
        {included.length === 0 && (
          <li className="text-[0.78125rem] text-ink-400">
            광고가 표시되고, 추천 경로 1개와 관심 지역 1곳을 쓸 수 있습니다.
          </li>
        )}
      </ul>

      <button
        onClick={onSelect}
        disabled={active}
        className={cn(
          'mt-5 h-11 rounded-lg text-[0.875rem] font-semibold transition-colors',
          active && 'cursor-default bg-surface-sunken text-ink-400',
          !active && isPaid && 'bg-brand-600 text-white hover:bg-brand-700',
          !active &&
            !isPaid &&
            'border border-line-strong text-ink-700 hover:bg-surface-sunken',
        )}
      >
        {active ? '사용 중' : isPaid ? '체험해보기' : '무료로 전환'}
      </button>

      {isPaid && !active && (
        <p className="mt-2 text-center text-[0.6875rem] text-ink-400">
          결제 없이 바로 적용됩니다
        </p>
      )}
    </section>
  );
}
