'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AreaRisk, RiskLevel } from '@/types';
import { DISTRICTS } from '@/data/districts';
import { PLACES } from '@/data/places';
import { RISK_LEVELS, RISK_LEVEL_ORDER } from '@/config/indicators';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { scoreColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';
import { useStored } from '@/lib/utils/local-store';

/**
 * 마이페이지 설정.
 *
 * 서버에 계정이 없으므로 모든 설정은 브라우저 localStorage에만 저장한다.
 * 개인정보를 서버로 보내지 않는다는 약속(/guide#privacy)을 코드 수준에서 지킨다.
 *
 * 저장/읽기는 useStored 훅이 담당한다 (lib/utils/local-store.ts).
 * 저장 실패(사생활 보호 모드 등)는 조용히 무시된다.
 */

/* 기본값은 모듈 상수로 둔다 — 렌더마다 새 배열을 만들면 훅이 계속 다시 계산한다 */
const NO_DISTRICTS: string[] = [];
const NO_ROUTES: SavedRoute[] = [];

const KEY = {
  districts: 'soomgil:favoriteDistricts',
  routes: 'soomgil:favoriteRoutes',
  alertLevel: 'soomgil:alertLevel',
} as const;

interface SavedRoute {
  from: string;
  to: string;
}

export function MyPageSettings({ districts }: { districts: AreaRisk[] }) {
  const [favorites, setFavorites] = useStored<string[]>(KEY.districts, NO_DISTRICTS);
  const [routes, setRoutes] = useStored<SavedRoute[]>(KEY.routes, NO_ROUTES);
  const [storedLevel, setStoredLevel] = useStored<RiskLevel>(KEY.alertLevel, 'high');

  // 저장된 값이 손상됐을 수 있으므로 한 번 검증하고 쓴다
  const alertLevel = RISK_LEVEL_ORDER.includes(storedLevel) ? storedLevel : 'high';

  const toggleDistrict = (id: string) => {
    setFavorites(
      favorites.includes(id)
        ? favorites.filter((x) => x !== id)
        : [...favorites, id],
    );
  };

  const addRoute = (from: string, to: string) => {
    if (from === to) return;
    if (routes.some((r) => r.from === from && r.to === to)) return;
    setRoutes([...routes, { from, to }].slice(-5));
  };

  const removeRoute = (index: number) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const changeAlert = (level: RiskLevel) => setStoredLevel(level);

  const watched = districts.filter((d) => favorites.includes(d.areaId));
  const alertIndex = RISK_LEVEL_ORDER.indexOf(alertLevel);
  const triggered = watched.filter(
    (d) => RISK_LEVEL_ORDER.indexOf(d.level) >= alertIndex,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 관심 지역 현황 */}
      {watched.length > 0 && (
        <section
          className={cn(
            'rounded-2xl border p-5 sm:p-6',
            triggered.length > 0
              ? 'border-risk-high/30 bg-risk-high/8'
              : 'border-risk-low/30 bg-risk-low/8',
          )}
        >
          <h2 className="text-[15px] font-bold text-ink-900">
            {triggered.length > 0
              ? `관심 지역 ${triggered.length}곳이 알림 기준을 넘었습니다`
              : '관심 지역이 모두 알림 기준 아래입니다'}
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {watched.map((area) => (
              <li
                key={area.areaId}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span
                  className="h-8 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: scoreColor(area.score) }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink-900">
                    {area.areaName}
                  </p>
                  <p className="tabular text-[11.5px] text-ink-400">
                    위험도 {Math.round(area.score)}
                  </p>
                </div>
                <RiskBadge level={area.level} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 관심 지역 선택 */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink-900">관심 지역</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          자주 머무는 자치구를 고르면 위 카드에서 바로 확인할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DISTRICTS.map((district) => {
            const on = favorites.includes(district.id);
            return (
              <button
                key={district.id}
                onClick={() => toggleDistrict(district.id)}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors',
                  on
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-line text-ink-600 hover:bg-surface-sunken',
                )}
              >
                {district.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* 알림 기준 */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink-900">알림 기준 등급</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          관심 지역이 이 등급 이상이 되면 위에 경고로 표시합니다.
        </p>
        <div
          className="mt-4 inline-flex flex-wrap gap-1.5 rounded-lg border border-line p-1"
          role="group"
          aria-label="알림 기준 등급"
        >
          {RISK_LEVEL_ORDER.slice(1).map((level) => (
            <button
              key={level}
              onClick={() => changeAlert(level)}
              aria-pressed={alertLevel === level}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                alertLevel === level
                  ? 'text-white'
                  : 'text-ink-500 hover:bg-surface-sunken hover:text-ink-900',
              )}
              style={
                alertLevel === level
                  ? { backgroundColor: RISK_LEVELS[level].color }
                  : undefined
              }
            >
              {RISK_LEVELS[level].label} 이상
            </button>
          ))}
        </div>
      </section>

      {/* 자주 쓰는 경로 */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink-900">자주 쓰는 경로</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          최대 5개까지 저장됩니다. 누르면 바로 경로 안내로 이동합니다.
        </p>

        <RouteAdder onAdd={addRoute} />

        {routes.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {routes.map((route, i) => {
              const from = PLACES.find((p) => p.id === route.from);
              const to = PLACES.find((p) => p.id === route.to);
              if (!from || !to) return null;
              return (
                <li
                  key={`${route.from}-${route.to}`}
                  className="flex items-center gap-2 rounded-xl border border-line px-4 py-3"
                >
                  <Link
                    href={`/route?from=${route.from}&to=${route.to}`}
                    className="min-w-0 flex-1 text-[13.5px] font-medium text-ink-900 hover:text-brand-600"
                  >
                    {from.name}
                    <span className="mx-2 text-ink-300" aria-hidden="true">
                      →
                    </span>
                    {to.name}
                  </Link>
                  <button
                    onClick={() => removeRoute(i)}
                    aria-label={`${from.name}에서 ${to.name} 경로 삭제`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-sunken hover:text-ink-900"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path
                        d="M5.5 5.5l9 9M14.5 5.5l-9 9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-[12.5px] text-ink-400">
            저장된 경로가 없습니다.
          </p>
        )}
      </section>

      <p className="text-[11.5px] leading-relaxed text-ink-400">
        모든 설정은 이 브라우저에만 저장되며 서버로 전송되지 않습니다. 브라우저 저장소를
        지우면 함께 사라집니다.
      </p>
    </div>
  );
}

function RouteAdder({ onAdd }: { onAdd: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(PLACES[0].id);
  const [to, setTo] = useState(PLACES[1].id);
  const categories = [...new Set(PLACES.map((p) => p.category))];

  const options = (excludeId: string) =>
    categories.map((category) => (
      <optgroup key={category} label={category}>
        {PLACES.filter((p) => p.category === category).map((place) => (
          <option key={place.id} value={place.id} disabled={place.id === excludeId}>
            {place.name}
          </option>
        ))}
      </optgroup>
    ));

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <select
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        aria-label="출발지"
        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[13.5px] text-ink-900 sm:h-10 sm:min-w-0 sm:flex-1"
      >
        {options(to)}
      </select>
      <select
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label="목적지"
        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[13.5px] text-ink-900 sm:h-10 sm:min-w-0 sm:flex-1"
      >
        {options(from)}
      </select>
      <button
        onClick={() => onAdd(from, to)}
        className="h-11 shrink-0 rounded-lg border border-line-strong px-4 text-[13.5px] font-semibold text-ink-700 transition-colors hover:bg-surface-sunken sm:h-10"
      >
        추가
      </button>
    </div>
  );
}
