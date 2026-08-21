'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { PlaceSuggestion } from '@/lib/routing/tmap-poi';
import { PLACES, searchPlaces as searchPresets } from '@/data/places';
import { cn } from '@/lib/utils/cn';

/**
 * 출발지·목적지 자유 검색 입력.
 *
 * TMAP 장소검색으로 아무 장소나 찾아 넣을 수 있다.
 * 검색 결과가 없거나 API가 실패하면 **미리 정의된 대전 주요 지점 목록**으로 되돌아간다.
 * 시연 도중 네트워크가 흔들려도 경로를 못 넣는 상황이 생기면 안 되기 때문이다.
 *
 * 앱키는 브라우저로 내려보내지 않는다. /api/places/search 를 거쳐 서버에서 호출한다.
 */

/** 목록에 뿌릴 한 항목 — 검색 결과와 기본 목록을 같은 모양으로 다룬다 */
interface Option {
  id: string;
  name: string;
  detail: string;
  /** 기본 목록에서 온 항목인지 */
  preset: boolean;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export function PlaceSearchInput({
  label,
  selectedId,
  selectedName,
  onSelect,
  excludeId,
}: {
  label: string;
  selectedId: string;
  selectedName: string;
  onSelect: (id: string, name: string) => void;
  /** 반대편에 이미 선택된 장소 — 같은 곳을 고르지 못하게 한다 */
  excludeId?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<PlaceSuggestion[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [activeIndex, setActiveIndex] = useState(0);

  /* 검색어가 바뀌면 잠시 기다렸다 한 번만 호출한다 (타이핑마다 부르지 않는다) */
  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < MIN_QUERY) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('loading');
      fetch(`/api/places/search?q=${encodeURIComponent(keyword)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { places: PlaceSuggestion[] }) => {
          setRemote(data.places ?? []);
          setStatus('done');
        })
        .catch((error: Error) => {
          if (error.name === 'AbortError') return;
          setRemote([]);
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /* 바깥을 누르면 닫는다 */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const keyword = query.trim();
  const searching = keyword.length >= MIN_QUERY;

  /*
   * 무엇을 보여줄지.
   *  - 검색 결과가 있으면 그것
   *  - 검색어가 짧거나 결과가 없으면 기본 목록 (검색어로 한 번 걸러서)
   * 두 경우를 같은 Option 모양으로 맞춰 아래 렌더링이 갈라지지 않게 한다.
   */
  const remoteOptions: Option[] = (remote ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    detail: [p.category, p.address].filter(Boolean).join(' · '),
    preset: false,
  }));

  const presetSource = keyword ? searchPresets(keyword, 8) : PLACES;
  const presetOptions: Option[] = presetSource.slice(0, 8).map((p) => ({
    id: p.id,
    name: p.name,
    detail: `${p.category} · 주요 지점`,
    preset: true,
  }));

  const usingFallback = !searching || status === 'error' || remoteOptions.length === 0;
  const options = (usingFallback ? presetOptions : remoteOptions).filter(
    (o) => o.id !== excludeId,
  );

  const commit = (option: Option) => {
    onSelect(option.id, option.name);
    setQuery(option.name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const picked = options[activeIndex];
      if (picked) {
        e.preventDefault();
        commit(picked);
      }
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="block">
        <span className="text-[0.75rem] font-semibold text-ink-500">{label}</span>
        <div className="relative mt-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setOpen(true);
              if (e.target.value.trim().length < MIN_QUERY) {
                // 검색어가 짧아지면 이전 결과를 남겨두지 않는다
                setRemote(null);
                setStatus('idle');
              }
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="장소나 주소를 검색하세요"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
            className="h-11 w-full rounded-lg border border-line-strong bg-surface pr-9 pl-3 text-[0.875rem] font-medium text-ink-900 transition-colors placeholder:font-normal placeholder:text-ink-300 hover:border-brand-300"
          />

          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
            {status === 'loading' ? (
              <span
                className="block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand-500"
                aria-hidden="true"
              />
            ) : (
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4 text-ink-300"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M13 13l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
        </div>
      </label>

      {/* 선택된 장소를 항상 보이게 — 입력창을 편집 중이어도 무엇이 잡혀 있는지 알아야 한다 */}
      {selectedName !== query && (
        <p className="mt-1 truncate text-[0.6875rem] text-ink-400">
          현재 선택: {selectedName}
        </p>
      )}

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {usingFallback && searching && status !== 'loading' && (
            <p className="border-b border-line bg-surface-sunken px-3.5 py-2 text-[0.71875rem] text-ink-500">
              {status === 'error'
                ? '장소 검색을 불러오지 못했습니다. 주요 지점에서 골라 주세요.'
                : '검색 결과가 없습니다. 주요 지점에서 골라 주세요.'}
            </p>
          )}

          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-3.5 py-3 text-[0.78125rem] text-ink-400">
                일치하는 장소가 없습니다.
              </li>
            )}

            {options.map((option, i) => (
              <li key={option.id} id={`${listId}-${i}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onClick={() => commit(option)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors',
                    i === activeIndex ? 'bg-brand-50' : 'hover:bg-surface-sunken',
                  )}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="flex-1 truncate text-[0.84375rem] font-semibold text-ink-900">
                      {option.name}
                    </span>
                    {option.id === selectedId && (
                      <span className="shrink-0 text-[0.65625rem] font-medium text-brand-600">
                        선택됨
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-[0.71875rem] text-ink-400">
                    {option.detail}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="border-t border-line px-3.5 py-2 text-[0.65625rem] text-ink-400">
            대전 안에 있는 장소만 검색됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
