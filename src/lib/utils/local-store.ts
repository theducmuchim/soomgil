'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * localStorage를 React 상태처럼 읽는다.
 *
 * ── 왜 useEffect + setState 가 아닌가 ────────────────────────
 * localStorage는 서버에 없다. 그래서 흔히 쓰는 방법이
 *   useEffect(() => { setState(localStorage.getItem(...)) }, [])
 * 인데, 이건 마운트 직후 렌더를 한 번 더 유발하고 React 규칙에도 어긋난다
 * (react-hooks/set-state-in-effect).
 *
 * useSyncExternalStore는 "React 바깥에 있는 값"을 읽기 위해 만들어진 API다.
 * 서버 렌더에서는 getServerSnapshot(null)을, 하이드레이션 이후에는 실제 값을
 * 쓰므로 hydration 불일치도 나지 않는다.
 *
 * 브라우저의 'storage' 이벤트는 **다른 탭**에서 바뀔 때만 발생하고 같은 문서에서는
 * 발생하지 않는다. 그래서 쓰기 시점에 직접 구독자를 깨우는 리스너 집합을 둔다.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * getSnapshot은 같은 값이면 같은 참조를 돌려줘야 한다.
 * 매번 localStorage를 읽으면 문자열은 같아도 무한 렌더 검사에 걸릴 수 있어 캐시한다.
 */
const cache = new Map<string, string | null>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readRaw(key: string): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    // 사생활 보호 모드 등으로 접근이 막혀도 화면은 계속 동작해야 한다
  }
  cache.set(key, value);
  return value;
}

function writeRaw(key: string, value: string): void {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안만 유지된다
  }
  for (const listener of listeners) listener();
}

/**
 * @param key      저장 키
 * @param fallback 저장된 값이 없을 때 쓸 값. 렌더마다 새로 만들지 말 것(모듈 상수 권장)
 */
export function useStored<T>(key: string, fallback: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null, // 서버에서는 저장된 값이 없다
  );

  const value = useMemo<T>(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const setValue = useCallback(
    (next: T) => {
      writeRaw(key, JSON.stringify(next));
    },
    [key],
  );

  return [value, setValue];
}

/** 저장된 값이 있는지 (서버 렌더 중에는 항상 false) */
export function useHasStoredValue(key: string): boolean {
  return (
    useSyncExternalStore(
      subscribe,
      () => readRaw(key),
      () => null,
    ) !== null
  );
}
