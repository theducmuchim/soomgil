'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 화면에 들어올 때 0에서 자라나는 막대.
 *
 * ── 왜 자라게 하는가 ──────────────────────────────────────
 * 이 서비스의 막대는 전부 **비교**다. 자치구 다섯 곳의 위험도, 지표별 기여도,
 * 경로별 그늘 비율. 완성된 채로 놓여 있으면 다섯 개가 동시에 눈에 들어와서
 * 어느 게 긴지 한 번 더 훑어야 한다. 같은 출발선에서 자라나면 **자라는 동안
 * 이미 순서가 보인다** — 먼저 멈추는 것이 짧은 것이다.
 *
 * ── 왜 transform 이 아니라 width 인가 ─────────────────────
 * scaleX 가 더 싸지만, 막대 끝에 라운드 처리가 있어서 scale 을 걸면 그 모서리도
 * 같이 눌려 찌그러진다. 막대 개수가 화면당 열 개 남짓이라 width 로 충분하다.
 */
export function GrowBar({
  /** 0~100 */
  pct,
  className,
  barClassName,
  style,
  delayMs = 0,
  label,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
  style?: React.CSSProperties;
  delayMs?: number;
  label?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      // 관찰할 수단이 없으면 바로 최종 상태로 (다음 프레임에 — 위 CountUp 주석 참고)
      const raf = requestAnimationFrame(() => setGrown(true));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setGrown(true);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const width = Math.max(0, Math.min(100, pct));

  return (
    <span
      ref={ref}
      className={cn('block w-full overflow-hidden rounded-full', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <span
        className={cn(
          'block h-full rounded-full',
          /*
            700ms 는 목록 하나가 위에서 아래로 훑히는 시간에 맞춘 값이다.
            더 빠르면 순서가 안 보이고, 더 느리면 기다리게 된다.
            곡선은 화면 전체와 같은 감속을 쓴다.
          */
          'transition-[width] duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
          barClassName,
        )}
        style={{
          width: grown ? `${width}%` : '0%',
          transitionDelay: `${delayMs}ms`,
          ...style,
        }}
      />
    </span>
  );
}
