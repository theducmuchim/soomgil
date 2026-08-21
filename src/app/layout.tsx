import type { Metadata, Viewport } from 'next';
import { SITE } from '@/config/site';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { SeasonToggle } from '@/components/season/SeasonToggle';
import { ALLOW_SEASON_OVERRIDE } from '@/lib/env';
import { resolveSeason } from '@/lib/risk/season';
import { Footer } from '@/components/layout/Footer';
import { UI_SCALE_INIT_SCRIPT } from '@/lib/a11y/uiScale';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    locale: 'ko_KR',
    type: 'website',
  },
};

/** 모바일 우선 — 길에서 한 손으로 보는 화면이 기본 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1b5b94',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Next 16부터는 CSS의 scroll-behavior:smooth 를 라우트 전환 때 덮어쓰지 않는다.
    // 그대로 두면 페이지 이동마다 위로 스르륵 스크롤돼 느리게 느껴진다.
    // data-scroll-behavior="smooth" 를 주면 이동은 즉시, 페이지 내 앵커(#terms 등)만 부드럽게 동작한다.
    <html lang="ko" data-scroll-behavior="smooth">
      <head>
        {/* Pretendard — 한글 본문 가독성. 로컬 폰트 파일 없이 CDN 사용 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/*
          저장해 둔 글자 크기를 첫 페인트 전에 적용한다.
          React 하이드레이션을 기다리면 매 페이지 이동마다 작은 글씨가 한 번
          보였다가 커지는 깜빡임이 생긴다 (lib/a11y/uiScale.ts 참고).
        */}
        <script dangerouslySetInnerHTML={{ __html: UI_SCALE_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-surface antialiased">
        {/* 키보드·스크린리더 사용자를 위한 본문 바로가기 */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        <Header />
        {/*
          계절 보기 전환.
          오늘이 아닌 계절은 실제 관측값이 없어 예시 데이터로 채워지고,
          그 사실을 토글 자리에서 "예시 데이터" 배지로 밝힌다.
          (useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense가 필요하다)
        */}
        {ALLOW_SEASON_OVERRIDE && (
          <Suspense fallback={null}>
            <SeasonToggle currentSeason={resolveSeason(new Date())} />
          </Suspense>
        )}
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
