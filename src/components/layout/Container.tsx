import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 페이지 가로 폭 기준.
 * 모바일 우선이라 좌우 패딩은 20px에서 시작해 화면이 커질수록 넓어진다.
 */
export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  /** wide: 지도·대시보드처럼 넓게 써야 하는 화면 */
  size?: 'default' | 'wide' | 'narrow';
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 sm:px-6 lg:px-8',
        size === 'default' && 'max-w-6xl',
        size === 'wide' && 'max-w-[1400px]',
        size === 'narrow' && 'max-w-3xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
