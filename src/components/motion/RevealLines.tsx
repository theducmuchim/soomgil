'use client';

import { useEffect, useRef, useState, type ElementType } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 제목이 줄 단위로 아래에서 올라온다.
 *
 * ── 왜 줄로 쪼개는가 ──────────────────────────────────────
 * 큰 제목이 한 덩어리로 뜨면 판때기 하나가 움직이는 것처럼 무겁다. 줄을
 * 나눠 차례로 올리면 문장을 읽는 순서와 움직임의 순서가 맞아떨어져서,
 * 애니메이션이 장식이 아니라 읽기를 돕는 쪽으로 붙는다.
 *
 * ── 왜 overflow-hidden 인가 ───────────────────────────────
 * 줄마다 감싼 상자가 넘치는 부분을 자른다. 글자가 그 상자 아래에서 **밀려
 * 올라오는** 것처럼 보이는 게 핵심이다. 자르지 않으면 그냥 떠오르기만 해서
 * 여느 fade-up 과 구분되지 않는다.
 *
 * 상자에 여유 padding 을 주는 이유는, 한글의 받침과 세리프의 아랫부분이
 * line-height 밖으로 나가 잘리기 때문이다. 잘린 획은 폰트가 깨진 것처럼 보인다.
 *
 * ── 접근성 ────────────────────────────────────────────────
 * 화면 낭독기에는 한 문장으로 읽혀야 한다. 시각적으로만 줄을 나눈 것이므로
 * 상자 전체에 원문을 aria-label 로 달고 조각들은 숨긴다.
 */
export function RevealLines({
  lines,
  as: Tag = 'h2',
  className,
  delayMs = 90,
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  /** 줄 사이 간격 */
  delayMs?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      // 관찰할 수단이 없으면 바로 최종 상태로 (다음 프레임에 — 위 CountUp 주석 참고)
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setShown(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span
          key={line + i}
          aria-hidden="true"
          /* 받침·세리프 아랫부분이 잘리지 않도록 위아래로 조금 열어 둔다 */
          className="block overflow-hidden py-[0.06em]"
        >
          <span
            className={cn(
              'block transition-transform duration-[850ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
              shown ? 'translate-y-0' : 'translate-y-full',
            )}
            style={{ transitionDelay: `${i * delayMs}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
