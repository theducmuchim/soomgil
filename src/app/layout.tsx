import type { Metadata, Viewport } from 'next';
import { SITE } from '@/config/site';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { SeasonToggle } from '@/components/season/SeasonToggle';
import { ALLOW_SEASON_OVERRIDE } from '@/lib/env';
import { resolveSeason } from '@/lib/risk/season';
import { Footer } from '@/components/layout/Footer';
import { UI_SCALE_INIT_SCRIPT } from '@/lib/a11y/uiScale';
import { pretendard, jejuDoldam } from './fonts';
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
  themeColor: '#0f1417',
  /*
   * 화면 가장자리까지 쓴다.
   *
   * 기본값(contain)은 노치와 홈 인디케이터를 피해 안쪽에만 그린다. 그러면
   * 전면 사진 히어로 위아래에 검은 띠가 남아 웹페이지 티가 난다.
   * cover 로 두면 사진이 상태바 밑까지 이어진다.
   *
   * 대신 **글자와 버튼이 노치 밑에 깔릴 수 있다**. 헤더·모바일 메뉴·
   * Container 가 env(safe-area-inset-*) 만큼 안쪽으로 물러나게 해 뒀다
   * (globals.css 의 안전 영역 규칙).
   */
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Next 16부터는 CSS의 scroll-behavior:smooth 를 라우트 전환 때 덮어쓰지 않는다.
    // 그대로 두면 페이지 이동마다 위로 스르륵 스크롤돼 느리게 느껴진다.
    // data-scroll-behavior="smooth" 를 주면 이동은 즉시, 페이지 내 앵커(#terms 등)만 부드럽게 동작한다.
    <html lang="ko" data-scroll-behavior="smooth" className={`${pretendard.variable} ${jejuDoldam.variable}`}>
      <head>
        {/*
          저장해 둔 글자 크기를 첫 페인트 전에 적용한다.
          React 하이드레이션을 기다리면 매 페이지 이동마다 작은 글씨가 한 번
          보였다가 커지는 깜빡임이 생긴다 (lib/a11y/uiScale.ts 참고).
        */}
        <script dangerouslySetInnerHTML={{ __html: UI_SCALE_INIT_SCRIPT }} />

        {/*
          스크립트가 꺼져 있으면 등장 애니메이션을 통째로 무력화한다.

          Reveal 은 서버 렌더에서 opacity-0 로 시작해 JS 가 뷰포트 진입을
          감지하면 드러낸다. JS 가 없으면 그 신호가 영영 오지 않아 본문이
          투명한 채로 남는다. 공공서비스 성격의 화면에서 내용이 아예 보이지
          않는 건 애니메이션이 없는 것보다 훨씬 큰 손해다.
        */}
        <noscript>
          <style>{'[data-reveal]{opacity:1!important;transform:none!important}'}</style>
        </noscript>
      </head>
      <body className="flex min-h-dvh flex-col bg-cream antialiased">
        {/* 키보드·스크린리더 사용자를 위한 본문 바로가기 */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        <Header />
        {/*
          계절 보기 전환.
          오늘이 아닌 계절은 실제 관측값이 없어 예시 데이터로 채워지고,
          그 사실을 토글 자리에서 "예시 데이터" 배지로 밝힌다.
          (useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense가 필요하다)

          홈은 빼둔다(omitPaths). 랜딩 히어로가 화면을 꽉 채워야 해서 헤더가
          사진 위로 떠 있는데, 그 아래 이 띠가 끼면 사진이 잘린다.
          홈에서는 app/page.tsx 가 히어로 **아래**에 직접 렌더한다.
        */}
        {ALLOW_SEASON_OVERRIDE && (
          <Suspense fallback={null}>
            <SeasonToggle currentSeason={resolveSeason(new Date())} omitPaths={['/']} />
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
