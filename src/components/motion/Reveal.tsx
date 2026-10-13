'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 스크롤 진입 등장.
 *
 * 뷰포트에 들어오는 순간 한 번만 아래에서 떠오르며 나타난다.
 *
 * ── 왜 한 번만인가 ────────────────────────────────────────
 * 화면을 오르내릴 때마다 다시 사라졌다 나타나면, 읽던 자리를 놓치고
 * 무엇보다 값이 바뀐 것처럼 보인다. 이 서비스의 섹션에는 실시간 위험도가
 * 들어 있어서 재생되는 애니메이션이 "지금 갱신됐다"는 오해를 부른다.
 * 그래서 한 번 나타나면 옵저버를 끊는다.
 *
 * ── 접근성 ────────────────────────────────────────────────
 * prefers-reduced-motion 은 globals.css 가 전역으로 transition-duration 을
 * 0.01ms 로 낮춰 처리한다. 여기서 따로 분기하지 않아도 애니메이션 없이
 * 즉시 최종 상태가 된다.
 *
 * JS 가 없거나 IntersectionObserver 가 없는 환경에서는 처음부터 보이는
 * 상태로 시작한다. 공공서비스 성격의 화면에서 내용이 아예 안 보이는 건
 * 애니메이션이 없는 것보다 훨씬 큰 손해다. (layout.tsx 의 noscript 규칙도
 * 같은 목적이다 — 스크립트가 꺼져 있으면 CSS 로 강제로 드러낸다)
 */
export function Reveal({
  children,
  /** 같은 줄에 여러 개가 있을 때 순서대로 터뜨리기 위한 지연(ms) */
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /*
   * 서버 렌더 결과는 '숨김'이다. 그래야 첫 페인트에서 이미 보이던 것이
   * 다시 떠오르는 이중 등장이 생기지 않는다. 다만 옵저버를 못 쓰는
   * 환경에서는 effect 첫 줄에서 바로 드러낸다.
   */
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      /*
       * 관찰할 수단이 없으면 '이미 보이는 것'으로 취급한다.
       *
       * 다음 프레임으로 미루는 건 lint 규칙(effect 안에서 동기 setState 금지)
       * 때문만이 아니다. 동기로 호출하면 첫 페인트 전에 상태가 뒤집혀
       * transition 이 걸릴 시작점이 없어진다. 한 프레임 뒤에 바꾸면
       * 어차피 보이는 결과는 같으면서 렌더가 한 번에 정리된다.
       */
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      {
        /*
         * 아래쪽 12% 를 미리 잘라 둔다.
         * 요소가 화면 맨 아래 끝에 걸치자마자 터지면 사용자가 아직 그쪽을
         * 보고 있지 않아 등장을 놓친다. 조금 더 올라온 뒤에 시작한다.
         */
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.05,
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={cn(
        /*
          곡선을 ease-out 에서 cubic-bezier(0.16, 1, 0.3, 1) 로 바꿨다.
          처음에 빠르게 나왔다가 끝에서 길게 눕는 감속이라 멈추는 순간이
          눈에 띄지 않는다. 기본 ease-out 은 끝에서 갑자기 서는 느낌이 남는다.
          RevealGroup 도 같은 곡선을 쓴다 — 한 화면에 두 감속이 섞이면 어긋나 보인다.
        */
        'transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
