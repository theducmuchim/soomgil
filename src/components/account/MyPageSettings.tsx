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
import { usePlanCapabilities } from '@/lib/subscription/usePlan';
import { PlanTrialPicker } from '@/components/subscription/PlanTrialPicker';
import { FREE_FAVORITE_LIMIT } from '@/config/plans';

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
  const { favorites: favoriteLimit, alerts, familySeats } = usePlanCapabilities();
  const [favorites, setFavorites] = useStored<string[]>(KEY.districts, NO_DISTRICTS);
  const [routes, setRoutes] = useStored<SavedRoute[]>(KEY.routes, NO_ROUTES);
  const [storedLevel, setStoredLevel] = useStored<RiskLevel>(KEY.alertLevel, 'high');

  // 저장된 값이 손상됐을 수 있으므로 한 번 검증하고 쓴다
  const alertLevel = RISK_LEVEL_ORDER.includes(storedLevel) ? storedLevel : 'high';

  /*
   * 관심 지역 한도.
   *
   * 제한에 걸렸을 때 그냥 눌리지 않게 하면 왜 안 되는지 알 수 없다.
   * 새로 고른 곳으로 바꿔주고, 여러 곳을 함께 보려면 어떤 요금제가 필요한지 알린다.
   */
  const multiFavorite = favoriteLimit > FREE_FAVORITE_LIMIT;
  const atLimit = !multiFavorite && favorites.length >= favoriteLimit;

  const toggleDistrict = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((x) => x !== id));
      return;
    }
    // 한도를 넘기면 가장 오래된 것을 밀어낸다
    setFavorites([...favorites, id].slice(-favoriteLimit));
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
      <PlanTrialPicker />

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
          <h2 className="text-[0.9375rem] font-bold text-ink-900">
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
                  <p className="text-[0.875rem] font-semibold text-ink-900">
                    {area.areaName}
                  </p>
                  <p className="tabular text-[0.71875rem] text-ink-400">
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[0.9375rem] font-bold text-ink-900">관심 지역</h2>
          <span className="text-[0.71875rem] text-ink-400">
            {multiFavorite ? '자치구 전체' : `${favoriteLimit}곳까지`}
          </span>
        </div>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
          자주 머무는 자치구를 고르면 위 카드에서 바로 확인할 수 있습니다.
          {!multiFavorite &&
            ` 지금 요금제에서는 ${favoriteLimit}곳만 저장되며, 다른 곳을 고르면 바뀝니다.`}
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
                  'rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-colors',
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

        {atLimit && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3.5 py-2.5 text-[0.71875rem] leading-relaxed text-brand-700">
            여러 자치구를 함께 보려면 프리미엄 이상이 필요합니다.{' '}
            <Link href="/pricing" className="font-semibold underline underline-offset-2">
              요금제 보기
            </Link>
          </p>
        )}
      </section>

      {/* 알림 기준 */}
      <section
        className={cn(
          'rounded-2xl border p-5 sm:p-6',
          alerts ? 'border-line bg-surface' : 'border-dashed border-line bg-surface-raised',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[0.9375rem] font-bold text-ink-900">알림 기준 등급</h2>
          {!alerts && (
            <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[0.65625rem] font-semibold text-white">
              프리미엄
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
          관심 지역이 이 등급 이상이 되면 위에 경고로 표시합니다.
        </p>

        {!alerts && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3.5 py-2.5 text-[0.71875rem] leading-relaxed text-brand-700">
            기준 등급 설정과 자동 알림은 프리미엄 이상에서 제공됩니다.{' '}
            <Link href="/pricing" className="font-semibold underline underline-offset-2">
              요금제 보기
            </Link>
          </p>
        )}

        <div
          className="mt-4 inline-flex flex-wrap gap-1.5 rounded-lg border border-line p-1"
          role="group"
          aria-label="알림 기준 등급"
        >
          {RISK_LEVEL_ORDER.slice(1).map((level) => (
            <button
              key={level}
              onClick={() => changeAlert(level)}
              disabled={!alerts}
              aria-pressed={alertLevel === level}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors',
                !alerts && 'cursor-not-allowed opacity-45',
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

      {/* 가족 계정 — 패밀리 요금제에서만 */}
      {familySeats > 1 && <FamilySeats seats={familySeats} />}

      {/* 자주 쓰는 경로 */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-[0.9375rem] font-bold text-ink-900">자주 쓰는 경로</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
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
                    className="min-w-0 flex-1 text-[0.84375rem] font-medium text-ink-900 hover:text-brand-600"
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
          <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-[0.78125rem] text-ink-400">
            저장된 경로가 없습니다.
          </p>
        )}
      </section>

      <p className="text-[0.71875rem] leading-relaxed text-ink-400">
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
        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.84375rem] text-ink-900 sm:h-10 sm:min-w-0 sm:flex-1"
      >
        {options(to)}
      </select>
      <select
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label="목적지"
        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.84375rem] text-ink-900 sm:h-10 sm:min-w-0 sm:flex-1"
      >
        {options(from)}
      </select>
      <button
        onClick={() => onAdd(from, to)}
        className="h-11 shrink-0 rounded-lg border border-line-strong px-4 text-[0.84375rem] font-semibold text-ink-700 transition-colors hover:bg-surface-sunken sm:h-10"
      >
        추가
      </button>
    </div>
  );
}

/**
 * 가족 계정 자리.
 *
 * 이 서비스가 가장 필요한 사람(호흡기가 약한 고령층)과 요금을 내는 사람(자녀)이
 * 다른 경우가 많아서 만든 요금제다. 계정 서버가 없어 실제 초대는 아직 붙일 수
 * 없으므로, 무엇이 공유되고 무엇이 공유되지 않는지만 분명히 적어 둔다.
 *
 * 초대 코드나 이메일 입력칸을 눌리지 않는 채로 두지 않는다 — 동작하지 않는
 * 입력칸은 "곧 됩니다"가 아니라 고장으로 읽힌다.
 */
function FamilySeats({ seats }: { seats: number }) {
  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.9375rem] font-bold text-ink-900">가족 계정</h2>
        <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[0.65625rem] font-semibold text-white">
          패밀리
        </span>
      </div>

      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
        본인 포함 최대 {seats}명이 함께 씁니다. 관심 지역과 알림 기준은 각자 따로
        설정되고, 요금과 광고 제거는 함께 적용됩니다.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: seats }, (_, i) => (
          <li
            key={i}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center',
              i === 0
                ? 'border-brand-300 bg-surface'
                : 'border-dashed border-line bg-surface/60',
            )}
          >
            <span className="text-[0.8125rem] font-semibold text-ink-900">
              {i === 0 ? '나' : `자리 ${i + 1}`}
            </span>
            <span className="text-[0.6875rem] text-ink-400">
              {i === 0 ? '사용 중' : '비어 있음'}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-surface px-3.5 py-2.5 text-[0.71875rem] leading-relaxed text-ink-500">
        가족 초대는 계정 서버가 필요해 아직 붙이지 않았습니다. 지금은 자리 수만
        보여드립니다.
      </p>
    </section>
  );
}
