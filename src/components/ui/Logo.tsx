import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { SITE } from '@/config/site';

/**
 * 로고 마크
 * 굽은 경로선(길) 위로 공기의 흐름이 지나가는 형태.
 * 아래쪽 굵은 선 = 이동 경로, 위쪽 두 가는 선 = 바람/공기.
 * 끝점의 원 = 목적지.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-8 w-8', className)}
    >
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      {/* 공기 흐름 */}
      <path
        d="M7 11.5c2.6-1.6 4.6 1.4 7.2-.2"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 15.4c3.6-2 6.4 1.8 10 -.2"
        stroke="white"
        strokeOpacity="0.75"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* 이동 경로 */}
      <path
        d="M7 22.5c4.2 0 5.4-4.2 9.6-4.2 2.4 0 3.6 1.2 5.4 1.2"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 목적지 */}
      <circle cx="24.2" cy="19.4" r="2.6" fill="white" />
      <circle cx="24.2" cy="19.4" r="1" className="fill-brand-600" />
    </svg>
  );
}

/** 마크 + 워드마크 */
export function Logo({
  className,
  href = '/',
  showTagline = false,
}: {
  className?: string;
  href?: string;
  showTagline?: boolean;
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[1.0625rem] font-bold tracking-tight text-ink-900">
          {SITE.name}
        </span>
        {showTagline && (
          <span className="mt-1 text-[0.6875rem] font-medium text-ink-400">
            {SITE.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
