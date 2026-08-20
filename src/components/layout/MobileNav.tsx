'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

/**
 * 모바일 전체 메뉴.
 * 길에서 한 손으로 쓰는 상황이라 항목 높이를 넉넉히(56px 이상) 잡고,
 * 핵심 CTA는 엄지가 닿는 화면 하단에 고정한다.
 */
export function MobileNav({ open, onClose, pathname }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc로 닫기 + 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={cn('lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* 배경 */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-ink-900/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* 패널 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-dvh w-[86%] max-w-sm flex-col',
          'bg-surface shadow-xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
          <Logo href="/" />
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken hover:text-ink-900"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-14 flex-col justify-center gap-0.5 rounded-lg px-3 py-2.5',
                      active ? 'bg-brand-50' : 'hover:bg-surface-sunken',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[15px] font-semibold',
                        active ? 'text-brand-700' : 'text-ink-900',
                      )}
                    >
                      {item.label}
                    </span>
                    {item.desc && (
                      <span className="text-[12.5px] leading-snug text-ink-400">
                        {item.desc}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <hr className="my-3 border-line" />

          <ul className="flex flex-col gap-0.5">
            {SECONDARY_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center rounded-lg px-3 text-[14px] font-medium',
                      active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-surface-sunken',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 하단 고정 CTA — 엄지 도달 범위 */}
        <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <Button href="/login" variant="secondary" size="lg" onClick={onClose} className="flex-1">
              로그인
            </Button>
            <Button href="/route" size="lg" onClick={onClose} className="flex-[1.4]">
              지금 경로 찾기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
