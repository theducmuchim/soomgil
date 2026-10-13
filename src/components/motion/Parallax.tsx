'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 스크롤보다 느리게 움직이는 배경.
 *
 * ── 왜 히어로에 쓰는가 ────────────────────────────────────
 * 사진 위에 글자를 얹은 화면에서, 둘이 완전히 같은 속도로 움직이면 사진이
 * 배경이 아니라 글자에 붙은 판때기처럼 읽힌다. 사진을 조금 느리게 흘리면
 * 글자가 그 앞에 떠 있는 것으로 보이고, 사진에 깊이가 생긴다.
 *
 * 계수는 0.15 정도가 한계다. 그 이상 벌리면 사진이 따라오지 못하는 게
 * 눈에 띄어서 오히려 어색해진다.
 *
 * ── 왜 scroll 이벤트를 직접 쓰나 ──────────────────────────
 * IntersectionObserver 는 "들어왔다/나갔다"만 알려 주지 얼마나 들어왔는지는
 * 주지 않는다. 매 프레임 위치가 필요해서 scroll 을 듣되, 실제 DOM 쓰기는
 * requestAnimationFrame 한 번으로 묶는다. passive 리스너라 스크롤 자체를
 * 막지 않는다.
 *
 * ── 접근성 ────────────────────────────────────────────────
 * prefers-reduced-motion 이면 아무것도 걸지 않는다. 패럴랙스는 멀미를
 * 유발하는 대표적인 효과라, 줄이는 정도가 아니라 끄는 게 맞다.
 */
export function Parallax({
  children,
  /** 스크롤 대비 배경이 움직이는 비율 (0 = 고정, 1 = 같이 움직임) */
  speed = 0.15,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let queued = false;

    const apply = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      // 화면 위로 얼마나 지나갔는가 — 요소가 뷰포트 아래에 있으면 0
      const passed = Math.max(0, -rect.top);
      el.style.transform = `translate3d(0, ${passed * speed}px, 0)`;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
