'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 숫자가 세어 올라가며 나타난다.
 *
 * ── 왜 숫자에만 쓰는가 ────────────────────────────────────
 * 이 서비스의 큰 숫자들은 전부 **계산 결과**다. 종합 위험도 52점, 대기정체
 * 보정 +13%, 노출 점수. 그냥 찍혀 있으면 어딘가 적혀 있던 값을 옮겨 온 것처럼
 * 보이는데, 올라가며 멈추면 "지금 계산해서 나온 값"으로 읽힌다. 이 서비스가
 * 실제로 하는 일이 그거라서, 움직임이 내용과 어긋나지 않는다.
 *
 * 반대로 본문이나 라벨에는 절대 쓰지 않는다. 글자가 움직이면 읽는 걸 방해할
 * 뿐이다.
 *
 * ── 감속 ──────────────────────────────────────────────────
 * 선형으로 세면 계수기처럼 보인다. 끝에서 길게 눕는 감속(easeOutExpo)을 쓰면
 * 마지막 몇 프레임에서 값이 거의 멈춘 채 미세하게 정착하는데, 그게 "재고
 * 있다"는 인상을 만든다.
 *
 * ── 접근성 ────────────────────────────────────────────────
 * prefers-reduced-motion 이면 첫 프레임에 최종값을 놓는다. 애니메이션을
 * 0.01ms 로 줄이는 CSS 전역 규칙은 JS 로 그리는 이 값에는 닿지 않으므로
 * 여기서 직접 본다.
 */
export function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 900,
  className,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      /*
        움직임을 줄이는 설정이거나 관찰할 수단이 없으면 최종값으로 앉힌다.
        다음 프레임으로 미루는 건, effect 안에서 동기로 상태를 바꾸면 렌더가
        한 번 더 도는 걸 lint 가 잡기 때문이다. 결과는 같다 — 첫 페인트에
        이미 최종값이 들어가 있다.
      */
      const raf = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(raf);
    }

    /*
     * 화면에 들어올 때 시작한다. 페이지 로드 시점에 한꺼번에 세면, 스크롤해서
     * 내려왔을 때는 이미 다 끝나 있어 아무것도 못 본다.
     */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setArmed(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  useEffect(() => {
    if (!armed) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // easeOutExpo — 끝에서 길게 눕는다
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    /*
      0으로 되돌리는 건 첫 tick 이 맡는다. 여기서 동기로 내리면 최종값이
      한 프레임 보였다가 0으로 튀는 깜빡임이 생긴다.
    */
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, to, durationMs]);

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
