'use client';

import { useMemo, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { AreaRisk, IndicatorReading, RiskSnapshot } from '@/types';
import { DONG_GEOJSON } from '@/data/geo/dong';
import { LAYERS, type LayerId } from '@/config/layers';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { MapFrame, type MapAreaFeatureProps } from '@/components/map';
import { MapLegend } from '@/components/map/MapLegend';
import { levelFromNormalized } from '@/lib/risk/score';
import { formatValue } from '@/lib/utils/format';
import { formatKstLong } from '@/lib/utils/time';
import { scoreColor } from '@/lib/risk/color';
import { cn } from '@/lib/utils/cn';

const MAP_GEOJSON = DONG_GEOJSON as FeatureCollection<Geometry, MapAreaFeatureProps>;

export function LayerMapView({
  snapshot,
  dongRisks,
}: {
  snapshot: RiskSnapshot;
  dongRisks: AreaRisk[];
}) {
  /** 이번 계절에 실제로 데이터가 있는 레이어만 켤 수 있다 */
  const availability = useMemo(() => {
    const sample = dongRisks[0];
    const map = new Map<LayerId, boolean>();
    for (const layer of LAYERS) {
      const has = layer.indicators.some((id) =>
        sample?.readings.some((r) => r.id === id && r.available),
      );
      map.set(layer.id, has);
    }
    return map;
  }, [dongRisks]);

  const firstAvailable = LAYERS.find((l) => availability.get(l.id))?.id ?? 'dust';
  const [active, setActive] = useState<LayerId[]>([firstAvailable]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggle = (id: LayerId) => {
    if (!availability.get(id)) return;
    setActive((prev) => {
      // 전부 끄면 빈 지도가 되므로 마지막 하나는 못 끄게 한다
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  /**
   * 선택된 레이어 기준으로 지역별 값을 다시 만든다.
   *
   * 지도 컴포넌트는 AreaRisk.score 로 색을 칠하므로, score 자리에
   * "이 레이어의 값"을 넣은 사본을 만들어 그대로 넘긴다.
   * 지도 컴포넌트를 레이어용으로 따로 만들지 않아도 된다.
   */
  const layerRisks = useMemo(
    () => dongRisks.map((area) => ({ ...area, score: layerScore(area, active) })),
    [dongRisks, active],
  );

  const ranked = useMemo(
    () => [...layerRisks].sort((a, b) => b.score - a.score),
    [layerRisks],
  );

  const selected = layerRisks.find((r) => r.areaId === selectedId) ?? null;
  const selectedSource = dongRisks.find((r) => r.areaId === selectedId) ?? null;

  const activeLabels = active.map((id) => LAYERS.find((l) => l.id === id)!.label);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
      <div className="flex flex-col gap-4">
        {/* 레이어 토글 */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.78125rem] font-semibold text-ink-900">위험요소 레이어</p>
            <p className="text-[0.71875rem] text-ink-400">
              기준 {formatKstLong(snapshot.baseTime)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {LAYERS.map((layer) => {
              const enabled = availability.get(layer.id) ?? false;
              const on = active.includes(layer.id);
              return (
                <button
                  key={layer.id}
                  onClick={() => toggle(layer.id)}
                  disabled={!enabled}
                  aria-pressed={on}
                  title={enabled ? layer.description : '지금은 서비스 기간이 아닙니다'}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors',
                    !enabled &&
                      'cursor-not-allowed border-dashed border-line text-ink-300',
                    enabled && on && 'border-transparent text-white',
                    enabled && !on && 'border-line text-ink-600 hover:bg-surface-sunken',
                  )}
                  style={enabled && on ? { backgroundColor: layer.color } : undefined}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: on && enabled ? '#ffffff' : layer.color,
                      opacity: enabled ? 1 : 0.35,
                    }}
                    aria-hidden="true"
                  />
                  {layer.label}
                  {!enabled && (
                    <span className="text-[0.65625rem] font-medium">서비스 기간 아님</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[0.71875rem] leading-relaxed text-ink-500">
            {active.length === 1
              ? LAYERS.find((l) => l.id === active[0])!.description
              : `${activeLabels.join(' + ')} 레이어를 겹쳐 봅니다. 겹칠 때는 각 레이어 값의 평균으로 색을 칠합니다.`}
          </p>
        </div>

        <div className="h-[52vh] min-h-[340px] overflow-hidden rounded-2xl border border-line lg:h-[560px]">
          <MapFrame
            geojson={MAP_GEOJSON}
            risks={layerRisks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            maxLabels={6}
          />
        </div>
      </div>

      {/* 사이드 */}
      <div className="flex flex-col gap-4">
        {selected && selectedSource ? (
          <LayerDetail
            areaName={selected.areaName}
            score={selected.score}
            readings={selectedSource.readings.filter((r) =>
              active.some((layerId) =>
                LAYERS.find((l) => l.id === layerId)!.indicators.includes(r.id),
              ),
            )}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-[0.84375rem] font-semibold text-ink-900">지역을 선택하세요</p>
            <p className="mt-1.5 text-[0.78125rem] leading-relaxed text-ink-500">
              지도나 아래 목록에서 지역을 고르면 켜 둔 레이어의 지표별 값을 볼 수
              있습니다.
            </p>
          </div>
        )}

        <MapLegend note="레이어 값은 지표의 0~100 정규화값입니다. 단위가 다른 지표(µg/m³·ppm·℃·지수)를 같은 눈금에서 비교하기 위한 변환입니다." />

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[0.78125rem] font-semibold text-ink-900">
            {activeLabels.join(' + ')} 높은 순
          </p>
          <ul className="mt-2.5 max-h-[300px] space-y-0.5 overflow-y-auto">
            {ranked.slice(0, 20).map((area, index) => (
              <li key={area.areaId}>
                <button
                  onClick={() =>
                    setSelectedId(area.areaId === selectedId ? null : area.areaId)
                  }
                  aria-pressed={area.areaId === selectedId}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    area.areaId === selectedId ? 'bg-brand-50' : 'hover:bg-surface-sunken',
                  )}
                >
                  <span className="tabular w-5 shrink-0 text-[0.6875rem] text-ink-300">
                    {index + 1}
                  </span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: scoreColor(area.score) }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-[0.8125rem] font-medium text-ink-900">
                    {area.areaName}
                  </span>
                  <span className="tabular shrink-0 text-[0.8125rem] font-bold text-ink-700">
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

/** 켜 둔 레이어들의 값 — 한 레이어 안에서는 최댓값, 레이어끼리는 평균 */
function layerScore(area: AreaRisk, active: LayerId[]): number {
  const values: number[] = [];

  for (const layerId of active) {
    const layer = LAYERS.find((l) => l.id === layerId);
    if (!layer) continue;

    const inLayer = area.readings
      .filter((r) => layer.indicators.includes(r.id) && r.available)
      .map((r) => r.normalized);

    if (inLayer.length > 0) values.push(Math.max(...inLayer));
  }

  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function LayerDetail({
  areaName,
  score,
  readings,
}: {
  areaName: string;
  score: number;
  readings: IndicatorReading[];
}) {
  const level = levelFromNormalized(score);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[1.0625rem] font-bold text-ink-900">{areaName}</h3>
        <span
          className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold text-white"
          style={{ backgroundColor: scoreColor(score) }}
        >
          {RISK_LEVELS[level].label} {Math.round(score)}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {readings.map((reading) => {
          const meta = INDICATORS[reading.id];
          return (
            <li key={reading.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[0.78125rem] font-medium text-ink-700">
                  {meta.shortLabel}
                </span>
                <span className="tabular text-[0.78125rem] text-ink-500">
                  {reading.available ? (
                    <>
                      {formatValue(reading.value, meta.unit)}
                      {meta.unit !== '℃' && meta.unit !== '지수' && ` ${meta.unit}`}
                      <span
                        className="ml-2 font-semibold"
                        style={{ color: RISK_LEVELS[reading.level].color }}
                      >
                        {RISK_LEVELS[reading.level].label}
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-300">서비스 기간 아님</span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${reading.available ? Math.max(2, reading.normalized) : 0}%`,
                    backgroundColor: scoreColor(reading.normalized),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-400">
        행정동 값은 자치구 관측값을 바탕으로 한 추정치입니다.
      </p>
    </div>
  );
}
