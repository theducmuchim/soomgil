'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { MobileNav } from '@/components/layout/MobileNav';
import { Container } from '@/components/layout/Container';
import { UiScaleToggle } from '@/components/a11y/UiScaleToggle';
import { NavDropdown } from '@/components/layout/NavDropdown';
import { cn } from '@/lib/utils/cn';

/*
 * 오버레이로 뜰 경로.
 *
 * 홈만이다. 홈의 첫 화면은 어두운 야경 사진이 화면을 꽉 채우는 랜딩이라,
 * 그 위에 흰 띠를 얹으면 사진이 잘리고 첫인상이 반 토막 난다.
 * 기능 화면(경로·지도·통계)은 사진 없이 바로 데이터가 나오므로 그대로 솔리드다.
 */
const OVERLAY_ROUTES = ['/'];

/**
 * 어두운 구간의 표식.
 *
 * 히어로가 첫 화면에서 끝나지 않고 소개글까지 사진을 끌고 내려간다.
 * 스크롤 몇 px 로 판단하면 아직 사진 위인데 헤더만 크림으로 굳어버린다.
 * 그래서 픽셀이 아니라 **그 구간이 아직 헤더 아래에 있는가**로 판단한다.
 */
const DARK_SECTION = '[data-dark-section]';

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const canOverlay = OVERLAY_ROUTES.includes(pathname);

  /*
   * 스크롤을 내리면 사진을 벗어나므로 오버레이를 풀어야 한다.
   * 그대로 두면 크림 지면 위에 크림색 글자가 남아 메뉴가 사라진다.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!canOverlay) return;

    const sync = () => {
      const dark = document.querySelector(DARK_SECTION);
      if (!dark) {
        // 표식이 없는 오버레이 경로는 예전대로 스크롤 여부만 본다
        setScrolled(window.scrollY > 8);
        return;
      }
      /*
        어두운 구간의 아랫변이 헤더 높이보다 위로 올라오면 그때 굳는다.
        헤더 높이를 빼는 건, 구간이 완전히 사라지기 전에 이미 헤더 뒤쪽은
        밝은 지면이기 때문이다.

        높이를 상수로 두지 않고 실제로 재는 이유: 노치가 있는 기기에서는
        safe-area 만큼 헤더가 더 두꺼워진다(safe-top). 56/64 로 박아 두면
        그 차이만큼 전환 시점이 어긋난다.
      */
      const headerH = document.querySelector('header')?.offsetHeight ?? 56;
      setScrolled(dark.getBoundingClientRect().bottom <= headerH);
    };

    sync(); // 새로고침으로 페이지 중간에서 들어온 경우
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [canOverlay]);

  /* 메뉴가 열리면 기준이 뒤의 사진이 아니라 메뉴 패널이 된다 */
  const overlay = canOverlay && !scrolled && !menuOpen;

  // 라우트가 바뀌면 열려 있던 메뉴를 닫는다.
  // 메뉴 안의 링크는 각자 onClose를 부르지만, 브라우저 뒤로가기로 이동한 경우는
  // 그 경로를 타지 않아서 여기서 한 번 더 막는다.
  // (effect 대신 렌더 중 상태 조정 — React 권장 패턴)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          'safe-top z-30 border-b transition-colors duration-200',
          /*
            오버레이 경로에서는 fixed 다.
            sticky 는 흐름 안에 자리를 차지해서, 그만큼 히어로가 아래로 밀리고
            화면 높이(h-screen)와 합쳐져 쓸데없는 세로 스크롤이 생긴다.
            fixed 로 띄우면 히어로가 뷰포트 맨 위에서 시작한다.
          */
          canOverlay ? 'fixed inset-x-0 top-0' : 'sticky top-0',
          overlay
            ? 'border-cream/15 bg-transparent'
            : 'border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80',
        )}
      >
        <Container size="wide">
          <div className="flex h-14 items-center justify-between gap-4 md:h-16">
            <div className="flex items-center gap-8">
              <Logo tone={overlay ? 'light' : 'dark'} />

              {/*
                주 메뉴.

                넷을 나란히 늘어놓는 대신 펼침 메뉴 하나로 묶었다. 라벨만으로는
                '위험 지도'와 '레이어 지도'가 어떻게 다른지 알 수 없는데,
                config 에 있던 한 줄 설명이 지금까지 모바일 메뉴에서만 쓰이고
                있었다. 헤더도 좁아져서 보조 메뉴를 접지 않아도 된다.
              */}
              <nav aria-label="주 메뉴" className="hidden lg:block">
                <NavDropdown overlay={overlay} isActive={isActive} />
              </nav>
            </div>

            <div className="flex items-center gap-1.5">
              {/*
                글자 크기 조절.
                설정 안쪽이 아니라 헤더에 두는 이유는, 이걸 필요로 하는 사람이
                메뉴를 뒤져 찾아내기를 기대할 수 없기 때문이다.
                좁은 화면에서는 자리가 없어 전체 메뉴 맨 위로 옮긴다.
              */}
              <UiScaleToggle
                tone={overlay ? 'light' : 'dark'}
                className="mr-1 hidden sm:flex"
              />

              <Link
                href="/login"
                className={cn(
                  'hidden rounded-full px-2.5 py-1.5 text-[0.875rem] font-semibold transition-colors lg:block',
                  overlay
                    ? 'text-cream/85 hover:bg-cream/10 hover:text-cream'
                    : 'text-ink-700 hover:bg-surface-sunken',
                )}
              >
                로그인
              </Link>

              {/*
                오버레이일 때 라임을 쓰지 않는 이유:
                바로 아래 히어로에 흰색 주 CTA가 있다. 헤더에 라임을 얹으면
                한 화면 안에서 색이 다른 CTA 둘이 주인공을 다툰다.
                헤더 버튼은 히어로에 자리를 내주는 쪽(onDark)이 맞다.
                라임은 히어로를 지나 크림 지면으로 넘어간 뒤부터 쓴다.
              */}
              <Button
                href="/route"
                size="sm"
                variant={overlay ? 'onDark' : 'primary'}
                className="hidden lg:inline-flex"
              >
                지금 경로 찾기
              </Button>

              {/* 모바일 CTA — 메뉴를 열지 않아도 핵심 기능에 바로 닿게 */}
              <Button
                href="/route"
                size="sm"
                variant={overlay ? 'onDark' : 'primary'}
                className="lg:hidden"
              >
                경로 찾기
              </Button>

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="전체 메뉴 열기"
                aria-expanded={menuOpen}
                className={cn(
                  '-mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden',
                  overlay
                    ? 'text-cream hover:bg-cream/10'
                    : 'text-ink-700 hover:bg-surface-sunken',
                )}
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M3 5.5h14M3 10h14M3 14.5h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </Container>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />
    </>
  );
}
