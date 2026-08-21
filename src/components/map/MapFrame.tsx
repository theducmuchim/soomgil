'use client';

import dynamic from 'next/dynamic';
import type { DaejeonMapProps } from './DaejeonMap';

/**
 * 지도 로더.
 *
 * Leaflet은 모듈을 불러오는 시점에 window를 건드리기 때문에 서버에서 렌더하면 깨진다.
 * ssr:false 로 브라우저에서만 불러온다. ssr:false 는 클라이언트 컴포넌트 안에서만
 * 쓸 수 있어서 이 파일이 'use client' 로 따로 존재한다.
 */
const DaejeonMap = dynamic(() => import('./DaejeonMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapFrame(props: DaejeonMapProps) {
  return <DaejeonMap {...props} />;
}

export function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-sunken">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-brand-500"
          aria-hidden="true"
        />
        <p className="text-[0.78125rem] text-ink-400">지도를 불러오는 중…</p>
      </div>
    </div>
  );
}
