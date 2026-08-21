import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { PlanComparison } from '@/components/pricing/PlanComparison';

export const metadata: Metadata = {
  title: '요금제',
  description:
    '무료·라이트·프리미엄·패밀리 네 가지 요금제를 비교합니다. 광고 제거, 경로 3안 비교, 관심 지역 알림, 가족 계정.',
};

export default function PricingPage() {
  return (
    <>
      <PageHeading
        eyebrow="요금제"
        title="필요한 만큼만 쓰세요"
        description="가입 없이 오늘의 위험도와 추천 경로를 확인할 수 있습니다. 광고만 빼고 싶다면 라이트, 매일 다니는 길이 있다면 프리미엄, 부모님 것까지 묶으려면 패밀리를 보세요."
      />

      <Container className="py-8 sm:py-10">
        <PlanComparison />

        <section className="mt-10 rounded-2xl border border-line bg-surface-sunken p-5 sm:p-6">
          <h2 className="text-[0.9375rem] font-bold text-ink-900">
            구독료는 어디에 쓰이나요
          </h2>
          <ul className="mt-3.5 space-y-2.5 text-[0.84375rem] leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">공공데이터 호출 한도 확장</strong> —
                개발계정은 하루 호출 수에 제한이 있습니다. 이용자가 늘면 유료 등급으로
                올려야 실시간성이 유지됩니다.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">경로 API 사용료</strong> — 실제 도로
                기반 경로는 호출당 비용이 발생합니다.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">행정동 단위 정밀도 개선</strong> —
                지금 행정동 값은 자치구 관측값에서 추정합니다. 측정 지점을 늘리면
                추정이 아닌 관측으로 바꿀 수 있습니다.
              </span>
            </li>
          </ul>
          <p className="mt-4 text-[0.75rem] text-ink-400">
            자세한 계산 방식과 데이터의 한계는{' '}
            <Link
              href="/guide#limits"
              className="font-medium text-brand-600 underline underline-offset-2"
            >
              이용안내
            </Link>
            에 정리해 두었습니다.
          </p>
        </section>
      </Container>
    </>
  );
}
