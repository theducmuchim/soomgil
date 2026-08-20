'use client';

import { useEffect, useMemo, useRef } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { AreaRisk } from '@/types';
import { DAEJEON_CENTER, DAEJEON_ZOOM } from '@/data/districts';
import { readableTextOn, scoreColor } from '@/lib/risk/color';
import 'leaflet/dist/leaflet.css';

export interface MapAreaFeatureProps {
  id: string;
  name: string;
}

export interface DaejeonMapProps {
  /** 그릴 경계 */
  geojson: FeatureCollection<Geometry, MapAreaFeatureProps>;
  /** areaId → 위험도 */
  risks: AreaRisk[];
  selectedId: string | null;
  onSelect: (areaId: string | null) => void;
  /**
   * 지도 위에 라벨을 몇 개까지 그릴지.
   * 자치구(5개)는 전부 그리고, 행정동(78개)은 위험한 순 상위 몇 개만 그린다.
   * 78개를 전부 그리면 라벨이 서로 겹쳐 아무것도 안 읽힌다.
   */
  maxLabels?: number;
}

/**
 * 대전 위험도 지도 (Leaflet).
 *
 * 색은 등급이 아니라 점수에서 뽑는다. 황사·미세먼지가 시 전역에 깔린 날에는
 * 5개 구가 전부 같은 등급이라 등급 색만으로는 지도가 통째로 한 색이 된다.
 *
 * 이 컴포넌트는 반드시 ssr:false 로 불러야 한다 (MapFrame 참조).
 * Leaflet은 모듈 로드 시점에 window를 건드려서 서버에서 그대로 import하면 깨진다.
 */
export default function DaejeonMap({
  geojson,
  risks,
  selectedId,
  onSelect,
  maxLabels = 5,
}: DaejeonMapProps) {
  const riskById = useMemo(() => new Map(risks.map((r) => [r.areaId, r])), [risks]);

  // GeoJSON 컴포넌트는 key가 같으면 style을 다시 계산하지 않는다.
  // 선택 상태나 데이터가 바뀌면 key를 바꿔 강제로 다시 그린다.
  const layerKey = useMemo(
    () => `${geojson.features.length}:${selectedId ?? 'none'}:${risks[0]?.score ?? 0}`,
    [geojson.features.length, selectedId, risks],
  );

  const style = (feature?: Feature<Geometry, MapAreaFeatureProps>): PathOptions => {
    const id = feature?.properties?.id;
    const risk = id ? riskById.get(id) : undefined;
    const selected = id === selectedId;

    return {
      fillColor: risk ? scoreColor(risk.score) : '#e2e7ec',
      fillOpacity: selected ? 0.92 : 0.74,
      color: selected ? '#14181d' : '#ffffff',
      weight: selected ? 2.5 : 1.2,
    };
  };

  const onEachFeature = (
    feature: Feature<Geometry, MapAreaFeatureProps>,
    layer: Layer,
  ) => {
    const { id, name } = feature.properties;
    const risk = riskById.get(id);

    layer.on({
      click: () => onSelect(id === selectedId ? null : id),
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as { setStyle?: (s: PathOptions) => void };
        target.setStyle?.({ fillOpacity: 0.95, weight: 2 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target as { setStyle?: (s: PathOptions) => void };
        target.setStyle?.(style(feature));
      },
    });

    if (risk) {
      layer.bindTooltip(
        `<span class="font-semibold">${name}</span> <span class="tabular">${Math.round(risk.score)}</span>`,
        { sticky: true, direction: 'top', className: 'soomgil-tooltip' },
      );
    }
  };

  return (
    <MapContainer
      center={DAEJEON_CENTER}
      zoom={DAEJEON_ZOOM}
      minZoom={10}
      maxZoom={14}
      scrollWheelZoom={false}
      zoomControl
      attributionControl
      className="h-full w-full"
    >
      <TileLayer
        /*
         * Carto Positron(라벨 없음).
         *
         * 라벨 있는 버전은 지명이 영문(DAEJEON, Bugang-myeon)으로 나와서
         * 한국어 서비스 화면에 섞이면 어색하다. 지명은 우리가 한글로 직접 그리고,
         * 베이스맵은 도로·하천 같은 지리적 맥락만 담당하게 한다.
         */
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains={['a', 'b', 'c', 'd']}
      />

      <GeoJSON
        key={layerKey}
        data={geojson as never}
        style={style as never}
        onEachFeature={onEachFeature as never}
      />

      <AreaLabels
        geojson={geojson}
        risks={risks}
        maxLabels={maxLabels}
        selectedId={selectedId}
      />
      <FitToData geojson={geojson} />
      <SelectionFocus geojson={geojson} selectedId={selectedId} />
    </MapContainer>
  );
}

/**
 * 지역명 + 점수 라벨.
 *
 * Leaflet의 divIcon 마커로 그린다. 폴리곤 중심(bounds center)에 놓으면
 * 대전 자치구·행정동 형태에서는 충분히 정확하다.
 */
function AreaLabels({
  geojson,
  risks,
  maxLabels,
  selectedId,
}: Pick<DaejeonMapProps, 'geojson' | 'risks' | 'selectedId'> & { maxLabels: number }) {
  const map = useMap();
  const markersRef = useRef<Layer[]>([]);

  useEffect(() => {
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled) return;

      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];

      // 위험한 순 상위 N개 + 선택된 지역은 항상 표시
      const labelIds = new Set(
        [...risks]
          .sort((a, b) => b.score - a.score)
          .slice(0, maxLabels)
          .map((r) => r.areaId),
      );
      if (selectedId) labelIds.add(selectedId);

      const riskById = new Map(risks.map((r) => [r.areaId, r]));

      for (const feature of geojson.features) {
        const id = feature.properties.id;
        if (!labelIds.has(id)) continue;

        const risk = riskById.get(id);
        if (!risk) continue;

        const center = L.geoJSON(feature as never).getBounds().getCenter();
        const bg = scoreColor(risk.score);

        const marker = L.marker(center, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'soomgil-area-label',
            html: `<span style="background:${bg};color:${readableTextOn(bg)}">${feature.properties.name} ${Math.round(risk.score)}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(map);

        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
    };
  }, [map, geojson, risks, maxLabels, selectedId]);

  return null;
}

/**
 * 데이터 전체가 화면에 들어오도록 맞춘다.
 *
 * 고정 center/zoom을 쓰면 화면 비율(모바일 세로 vs 데스크톱 가로)에 따라
 * 대전 남쪽이나 북쪽이 잘려 나간다.
 */
function FitToData({ geojson }: Pick<DaejeonMapProps, 'geojson'>) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled) return;
      const bounds = L.geoJSON(geojson as never).getBounds();
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, { padding: [18, 18] });
    });

    return () => {
      cancelled = true;
    };
    // geojson이 바뀔 때(자치구 ↔ 행정동)만 다시 맞춘다
  }, [map, geojson]);

  return null;
}

/** 선택된 지역으로 지도를 부드럽게 이동 */
function SelectionFocus({
  geojson,
  selectedId,
}: Pick<DaejeonMapProps, 'geojson' | 'selectedId'>) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const feature = geojson.features.find((f) => f.properties.id === selectedId);
    if (!feature) return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled) return;
      const bounds = L.geoJSON(feature as never).getBounds();
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 13 });
    });

    return () => {
      cancelled = true;
    };
  }, [map, geojson, selectedId]);

  return null;
}
