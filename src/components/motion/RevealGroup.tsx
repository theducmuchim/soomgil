'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 자식들을 차례로 떠오르게 하는 묶음.
 *
 * ── Reveal 과 무엇이 다른가 ───────────────────────────────
 * Reveal 은 덩어리 하나를 통째로 다룬다. 하위 페이지처럼 문단·카드·표가
 * 줄줄이 이어지는 화면에서는 그 단위가 너무 크다. 페이지 전체가 한 번에
 * 나타나면 등장이라기보다 늦게 로딩된 것처럼 보인다.
 *
 * 여기서는 **직계 자식 하나하나**를 따로 관찰해서, 각자 화면에 들어올 때
 * 떠오르게 한다. 스크롤을 내리는 속도에 맞춰 자연스럽게 이어진다.
 *
 * ── 왜 JSX 를 고치지 않고 DOM 을 건드리나 ─────────────────
 * 자식을 감싸려면 페이지마다 구조를 뜯어야 하는데, 안내 페이지 하나가
 * 600줄이다. 대신 마운트 후에 실제 DOM 자식에 표시를 붙인다. 서버가 내려준
 * 마크업은 그대로고, 스크립트가 없으면 표시가 안 붙어 **아무 일도 일어나지
 * 않는다** — 내용이 투명한 채 남을 위험이 없다. Reveal 이 noscript 규칙을
 * 따로 둬야 했던 것과 대비된다.
 */
export function RevealGroup({
  children,
  className,
  /** 한 화면에 여러 개가 동시에 들어올 때의 간격(ms) */
  stagger = 70,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const items = Array.from(root.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (items.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') return;

    for (const el of items) el.dataset.revealItem = '';

    const io = new IntersectionObserver(
      (entries) => {
        /*
         * 한 번에 여러 개가 들어오면 순서대로 터뜨린다.
         * 같은 프레임에 셋이 나타나면 어느 것부터 읽어야 할지 알려 주지 않는다.
         */
        const arriving = entries.filter((e) => e.isIntersecting);
        arriving.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          window.setTimeout(() => {
            el.dataset.revealIn = '';
          }, i * stagger);
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
    );

    for (const el of items) io.observe(el);
    return () => io.disconnect();
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
