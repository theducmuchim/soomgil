'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/config/site';
import { cn } from '@/lib/utils/cn';

/**
 * 헤더의 펼침 메뉴.
 *
 * ── 왜 필요한가 ───────────────────────────────────────────
 * 주 메뉴 넷이 나란히 놓여 있었는데, 라벨만으로는 '위험 지도'와 '레이어 지도'가
 * 어떻게 다른지 알 수 없다. config 에 이미 한 줄 설명(desc)이 있는데 화면 어디에도
 * 나오지 않았다 — 모바일 메뉴에서만 쓰이고 있었다.
 *
 * ── 열고 닫기 ─────────────────────────────────────────────
 * 마우스가 올라가면 열고, 벗어나면 닫는다. 다만 **닫을 때만 지연**을 준다.
 * 메뉴 이름에서 패널로 마우스를 옮기는 사이에 잠깐 둘 다 벗어나는 구간이
 * 생기는데, 지연이 없으면 그 순간 패널이 닫혀 버린다.
 *
 * 키보드로는 포커스가 들어오면 열리고 Esc 로 닫힌다. 마우스 없이도 같은
 * 정보에 닿아야 한다.
 */

/** 이름에서 패널로 마우스가 건너갈 시간 */
const CLOSE_DELAY_MS = 140;

export function NavDropdown({ overlay, isActive }: {
  overlay: boolean;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const anyActive = PRIMARY_NAV.some((item) => isActive(item.href));

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-16 items-center gap-1.5 px-3 text-[0.875rem] font-semibold transition-colors',
          overlay
            ? anyActive
              ? 'text-cream'
              : 'text-cream/75 hover:text-cream'
            : anyActive
              ? 'text-brand-700'
              : 'text-ink-700 hover:text-brand-600',
        )}
      >
        서비스
        <svg
          viewBox="0 0 16 16"
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6.5 8 10.5 12 6.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/*
        패널.
        pointer-events 를 닫힌 상태에서 꺼 두는 게 중요하다. opacity 만 0으로
        두면 보이지 않는 판이 헤더 아래를 덮어, 그 아래 내용이 클릭되지 않는다.
      */}
      <div
        className={cn(
          'absolute top-full left-0 z-40 pt-2 transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        )}
      >
        <div className="floating w-[42rem] rounded-2xl border border-cream-line bg-surface p-2">
          <ul className="grid grid-cols-2 gap-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-3.5 py-3 transition-colors',
                    isActive(item.href) ? 'bg-cream-deep' : 'hover:bg-cream-deep',
                  )}
                >
                  <span className="font-display text-[1.0625rem] leading-none font-normal text-night">
                    {item.label}
                  </span>
                  {item.desc && (
                    <span className="mt-1.5 block text-[0.8125rem] leading-snug text-ink-500">
                      {item.desc}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/*
            보조 메뉴를 같은 패널 아래쪽에 붙인다.
            헤더에는 넓은 화면에서만 나오던 것들이라, 창을 줄이면 닿을 길이
            햄버거 메뉴뿐이었다.
          */}
          <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t border-cream-line px-2 pt-2">
            {SECONDARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-full px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink-500 transition-colors hover:bg-cream-deep hover:text-night"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
