'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { MobileNav } from '@/components/layout/MobileNav';
import { Container } from '@/components/layout/Container';
import { UiScaleToggle } from '@/components/a11y/UiScaleToggle';
import { cn } from '@/lib/utils/cn';

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <Container size="wide">
          <div className="flex h-14 items-center justify-between gap-4 md:h-16">
            <div className="flex items-center gap-8">
              <Logo />

              {/* 주 메뉴 (데스크톱) */}
              <nav aria-label="주 메뉴" className="hidden lg:block">
                <ul className="flex items-center gap-1">
                  {PRIMARY_NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        className={cn(
                          'relative flex h-16 items-center px-3 text-[0.90625rem] font-semibold transition-colors',
                          isActive(item.href)
                            ? 'text-brand-700'
                            : 'text-ink-700 hover:text-brand-600',
                        )}
                      >
                        {item.label}
                        {isActive(item.href) && (
                          <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="flex items-center gap-1.5">
              {/*
                글자 크기 조절.
                설정 안쪽이 아니라 헤더에 두는 이유는, 이걸 필요로 하는 사람이
                메뉴를 뒤져 찾아내기를 기대할 수 없기 때문이다.
                좁은 화면에서는 자리가 없어 전체 메뉴 맨 위로 옮긴다.
              */}
              <UiScaleToggle className="mr-1 hidden sm:flex" />

              {/* 보조 메뉴 — 넓은 화면에서만 */}
              <nav aria-label="보조 메뉴" className="hidden xl:block">
                <ul className="flex items-center gap-0.5">
                  {SECONDARY_NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        className={cn(
                          'rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
                          isActive(item.href)
                            ? 'text-brand-700'
                            : 'text-ink-400 hover:bg-surface-sunken hover:text-ink-700',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <Link
                href="/login"
                className="hidden rounded-md px-2.5 py-1.5 text-[0.84375rem] font-semibold text-ink-700 transition-colors hover:bg-surface-sunken lg:block"
              >
                로그인
              </Link>

              <Button href="/route" size="sm" className="hidden lg:inline-flex">
                지금 경로 찾기
              </Button>

              {/* 모바일 CTA — 메뉴를 열지 않아도 핵심 기능에 바로 닿게 */}
              <Button href="/route" size="sm" className="lg:hidden">
                경로 찾기
              </Button>

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="전체 메뉴 열기"
                aria-expanded={menuOpen}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-surface-sunken lg:hidden"
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
