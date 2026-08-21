'use client';

import { useSyncExternalStore } from 'react';

/**
 * 주기적으로 갱신되는 "지금".
 *
 * "3분 전 갱신" 같은 상대 시각은 가만히 두면 시간이 지나도 3분 전에 머문다.
 * 화면을 열어 둔 채 30분이 지나도 데이터가 방금 온 것처럼 보이면 곤란하다.
 *
 * ── 왜 useState + setInterval 이 아닌가 ──────────────────
 * 서버 렌더에는 "지금"이 없다. 서버 시각으로 그리면 하이드레이션 때 값이 달라
 * 불일치가 난다. useSyncExternalStore 의 서버 스냅샷을 null 로 두면
 * 서버에서는 상대 시각을 아예 그리지 않고, 브라우저에서만 채워 넣는다.
 *
 * 타이머는 구독자가 있을 때만 돈다. 이 훅을 쓰는 화면이 없으면 멈춘다.
 */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;

/** 상대 시각은 분 단위라 30초면 충분히 촘촘하다 */
const TICK_MS = 30_000;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** 브라우저에서는 현재 시각(ms), 서버 렌더에서는 null */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (snapshot === 0) snapshot = Date.now();
      return snapshot;
    },
    () => null,
  );
}
