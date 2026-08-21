'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { TRAVEL_MODES, type TravelMode } from '@/lib/routing';
import { PlaceSearchInput } from '@/components/route/PlaceSearchInput';
import { cn } from '@/lib/utils/cn';

/**
 * 출발지·목적지 입력.
 *
 * TMAP 장소검색으로 아무 장소나 넣을 수 있고, 검색이 안 되면 미리 정의된
 * 대전 주요 지점 목록으로 되돌아간다 (PlaceSearchInput 참조).
 *
 * 상태를 컴포넌트에 들지 않고 URL 쿼리로 관리한다.
 * 그래야 특정 경로 화면을 그대로 링크로 공유할 수 있고,
 * 계산은 서버에서 한 번만 일어난다.
 */

interface PlaceRef {
  id: string;
  name: string;
}

export function RoutePlannerForm({
  origin,
  destination,
  mode,
}: {
  origin: PlaceRef;
  destination: PlaceRef;
  mode: TravelMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState<PlaceRef>(origin);
  const [to, setTo] = useState<PlaceRef>(destination);

  const push = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    router.push(`/route?${params.toString()}`, { scroll: false });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    push({ from: to.id, to: from.id });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    push({ from: from.id, to: to.id });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        <PlaceSearchInput
          label="출발지"
          selectedId={from.id}
          selectedName={from.name}
          onSelect={(id, name) => setFrom({ id, name })}
          excludeId={to.id}
        />

        <button
          type="button"
          onClick={swap}
          aria-label="출발지와 목적지 바꾸기"
          className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink-500 transition-colors hover:bg-surface-sunken hover:text-ink-900 sm:mt-6"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M6 4v12M6 16l-2.5-2.5M6 16l2.5-2.5M14 16V4M14 4l-2.5 2.5M14 4l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <PlaceSearchInput
          label="목적지"
          selectedId={to.id}
          selectedName={to.name}
          onSelect={(id, name) => setTo({ id, name })}
          excludeId={from.id}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-line p-1"
          role="group"
          aria-label="이동 수단"
        >
          {(Object.keys(TRAVEL_MODES) as TravelMode[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => push({ mode: key })}
              aria-pressed={mode === key}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                mode === key
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-500 hover:bg-surface-sunken hover:text-ink-900',
              )}
            >
              {TRAVEL_MODES[key].label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="h-11 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:h-10"
        >
          경로 찾기
        </button>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
        이동 수단에 따라 같은 구간이라도 머무는 시간이 달라져 노출량이 바뀝니다. 현재{' '}
        {TRAVEL_MODES[mode].label} 기준 {TRAVEL_MODES[mode].note}로 계산합니다.
      </p>
    </form>
  );
}
