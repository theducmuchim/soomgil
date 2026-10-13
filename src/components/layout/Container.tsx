import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { RevealGroup } from '@/components/motion/RevealGroup';

/**
 * 페이지 가로 폭 기준.
 * 모바일 우선이라 좌우 패딩은 20px에서 시작해 화면이 커질수록 넓어진다.
 */
export function Container({
  children,
  className,
  size = 'default',
  reveal = false,
}: {
  children: ReactNode;
  className?: string;
  /** wide: 지도·대시보드처럼 넓게 써야 하는 화면 */
  size?: 'default' | 'wide' | 'narrow';
  /**
   * 직계 자식들을 스크롤 진입에 맞춰 차례로 떠오르게 한다.
   *
   * 여기에 둔 이유는 페이지마다 JSX 를 뜯지 않기 위해서다. 하위 페이지는
   * 전부 이 Container 하나로 본문을 감싸고 있어서, 속성 하나만 켜면 된다.
   */
  reveal?: boolean;
}) {
  return (
    <div
      className={cn(
        /*
          좌우 여백에 안전 영역을 얹는다 (safe-x, globals.css).
          세로 화면에서는 env(safe-area-inset-*) 가 0이라 px-5 그대로이고,
          가로로 눕혔을 때만 노치 쪽이 밀린다.
        */
        'safe-x mx-auto w-full [--gutter-x:1.25rem] sm:[--gutter-x:1.5rem] lg:[--gutter-x:2rem]',
        size === 'default' && 'max-w-6xl',
        size === 'wide' && 'max-w-[1400px]',
        size === 'narrow' && 'max-w-3xl',
        className,
      )}
    >
      {reveal ? <RevealGroup>{children}</RevealGroup> : children}
    </div>
  );
}
