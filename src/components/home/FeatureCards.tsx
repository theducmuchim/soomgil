import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';

interface Feature {
  href: string;
  title: string;
  body: string;
  /** 카드 하단의 구체적 기능 3가지 */
  points: string[];
  icon: ReactNode;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const FEATURES: Feature[] = [
  {
    href: '/route',
    title: '경로 안내',
    body: '출발지와 목적지를 넣으면 지금 이 순간 상대적으로 안전한 길을 비교해서 보여줘요.',
    points: ['가장 안전한 길 · 균형 · 최단 시간 3안 비교', '최단 경로 대비 노출량 증감률', '구간별 위험도와 풍향 반영'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M5 19c3.5 0 4.5-4.2 8-4.2 2 0 3 1 4.5 1" {...stroke} strokeWidth={1.8} />
        <circle cx="5" cy="19" r="1.8" {...stroke} />
        <path d="M19 4.5c1.4 0 2.5 1.1 2.5 2.5 0 1.9-2.5 4.5-2.5 4.5S16.5 8.9 16.5 7c0-1.4 1.1-2.5 2.5-2.5Z" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/risk-map',
    title: '위험 지도',
    body: '대전 자치구와 행정동 단위로 지금 위험도를 색으로 확인할 수 있어요.',
    points: ['자치구 ↔ 행정동 해상도 전환', '지역별 지표 상세값', '풍향·풍속 표시'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" {...stroke} />
        <path d="M9 4v13.5M15 6.5V20" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/layers',
    title: '레이어 지도',
    body: '꽃가루·미세먼지·폭염·오존을 켜고 끄면서 지표별로 겹쳐 볼 수 있어요.',
    points: ['위험요소 4종 레이어 토글', '서비스 기간 아닌 지표 자동 비활성', '대기정체 오버레이'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z" {...stroke} />
        <path d="M3.5 12.5 12 16.8l8.5-4.3M3.5 16.5 12 20.8l8.5-4.3" {...stroke} />
      </svg>
    ),
  },
];

/** "이런 걸 할 수 있어요" — 핵심 기능 3가지 */
export function FeatureCards() {
  return (
    <section className="border-b border-line py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-[0.78125rem] font-semibold tracking-wide text-brand-600">
            주요 기능
          </p>
          <h2 className="mt-2 text-[1.625rem] leading-tight font-bold tracking-tight text-ink-900 sm:text-[2rem]">
            이런 걸 할 수 있어요
          </h2>
        </div>

        <ul className="mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
          {FEATURES.map((feature) => (
            <li key={feature.href}>
              <Link
                href={feature.href}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40 sm:p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  {feature.icon}
                </span>

                <h3 className="mt-4 text-[1rem] font-bold text-ink-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[0.84375rem] leading-relaxed text-ink-500">
                  {feature.body}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2 text-[0.78125rem] leading-snug text-ink-500"
                    >
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-300"
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                <span className="mt-4 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-600">
                  바로 가기
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M6 3.5 10.5 8 6 12.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
