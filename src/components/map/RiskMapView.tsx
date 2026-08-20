'use client';

import { useMemo, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { AreaRisk, RiskSnapshot } from '@/types';
import { DISTRICT_GEOJSON } from '@/data/geo/districts';
import { DONG_GEOJSON } from '@/data/geo/dong';
import { MapFrame, type MapAreaFeatureProps } from '@/components/map';
import { MapLegend } from '@/components/map/MapLegend';
import { AreaDetailPanel } from '@/components/risk/AreaDetailPanel';
import { scoreColor } from '@/lib/risk/color';
import { formatKstLong } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

type Resolution = 'district' | 'dong';

/** GeoJSON의 properties를 지도 컴포넌트가 기대하는 최소 형태로 좁힌다 */
function toMapGeoJson(
  source: FeatureCollection<Geometry, { id: string; name: string }>,
): FeatureCollection<Geometry, MapAreaFeatureProps> {
  return source;
}

const DISTRICT_MAP_GEOJSON = toMapGeoJson(DISTRICT_GEOJSON);
const DONG_MAP_GEOJSON = toMapGeoJson(DONG_GEOJSON);

export function RiskMapView({
  snapshot,
  dongRisks,
}: {
  snapshot: RiskSnapshot;
  dongRisks: AreaRisk[];
}) {
  const [resolution, setResolution] = useState<Resolution>('district');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isDong = resolution === 'dong';
  const risks = isDong ? dongRisks : snapshot.districts;
  const geojson = isDong ? DONG_MAP_GEOJSON : DISTRICT_MAP_GEOJSON;

  const ranked = useMemo(
    () => [...risks].sort((a, b) => b.score - a.score),
    [risks],
  );

  const selected = useMemo(
    () => risks.find((r) => r.areaId === selectedId) ?? null,
    [risks, selectedId],
  );

  /** 해상도를 바꾸면 이전 선택은 다른 레이어의 id라 의미가 없어진다 */
  const changeResolution = (next: Resolution) => {
    setResolution(next);
    setSelectedId(null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
      {/* 지도 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border border-line bg-surface p-1"
            role="group"
            aria-label="지도 해상도"
          >
            {(
              [
                ['district', '자치구', 5],
                ['dong', '행정동', DONG_GEOJSON.features.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => changeResolution(value)}
                aria-pressed={resolution === value}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  resolution === value
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-500 hover:bg-surface-sunken hover:text-ink-900',
                )}
              >
                {label}
                <span
                  className={cn(
                    'tabular ml-1.5 text-[11px]',
                    resolution === value ? 'text-white/70' : 'text-ink-300',
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[11.5px] text-ink-400">
            기준 {formatKstLong(snapshot.baseTime)}
          </p>
        </div>

        <div className="h-[52vh] min-h-[340px] overflow-hidden rounded-2xl border border-line lg:h-[calc(100vh-22rem)] lg:min-h-[460px]">
          <MapFrame
            geojson={geojson}
            risks={risks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            maxLabels={isDong ? 6 : 5}
          />
        </div>

        {isDong && (
          <p className="rounded-lg bg-surface-sunken px-4 py-3 text-[11.5px] leading-relaxed text-ink-500">
            행정동 값은 관측값이 아니라 <strong className="font-semibold">추정치</strong>입니다.
            대기질 관측은 에어코리아 측정소 단위(대전 10곳), 기상 예보는 약 5km 격자
            단위라 행정동 78개를 직접 관측한 데이터는 존재하지 않습니다. 자치구
            관측값을 기준으로 동별 편차를 적용해 계산합니다.
          </p>
        )}
      </div>

      {/* 사이드 패널 */}
      <div className="flex flex-col gap-4">
        {selected ? (
          <AreaDetailPanel area={selected} estimated={isDong} />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-[13.5px] font-semibold text-ink-900">
              지역을 선택하세요
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
              지도에서 지역을 누르거나 아래 목록에서 고르면 지표별 상세값과 점수 계산
              과정을 볼 수 있습니다.
            </p>
          </div>
        )}

        <MapLegend note="색은 등급이 아니라 점수(0~100)에서 계산합니다. 같은 등급 안에서도 어디가 더 나쁜지 보이도록 하기 위해서입니다." />

        {/* 목록 — 지도를 못 쓰는 환경(키보드·스크린리더)에서도 같은 정보에 닿게 한다 */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[12.5px] font-semibold text-ink-900">
            위험한 순 {isDong ? '행정동' : '자치구'}
          </p>
          <ul className="mt-2.5 max-h-[320px] space-y-0.5 overflow-y-auto">
            {ranked.map((area, index) => (
              <li key={area.areaId}>
                <button
                  onClick={() =>
                    setSelectedId(area.areaId === selectedId ? null : area.areaId)
                  }
                  aria-pressed={area.areaId === selectedId}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    area.areaId === selectedId
                      ? 'bg-brand-50'
                      : 'hover:bg-surface-sunken',
                  )}
                >
                  <span className="tabular w-5 shrink-0 text-[11px] text-ink-300">
                    {index + 1}
                  </span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: scoreColor(area.score) }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-[13px] font-medium text-ink-900">
                    {area.areaName}
                  </span>
                  <span className="tabular shrink-0 text-[13px] font-bold text-ink-700">
                    {Math.round(area.score)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
