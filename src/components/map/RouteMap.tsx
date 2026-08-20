'use client';

import { useEffect, useMemo } from 'react';
import { GeoJSON, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import type { AreaRisk, RouteOption, RouteResult } from '@/types';
import { DONG_GEOJSON, type DongFeatureProps } from '@/data/geo/dong';
import { DAEJEON_CENTER, DAEJEON_ZOOM } from '@/data/districts';
import { scoreColor } from '@/lib/risk/color';
import 'leaflet/dist/leaflet.css';

export interface RouteMapProps {
  result: RouteResult;
  dongRisks: AreaRisk[];
  selectedRouteId: string;
}

/**
 * 경로 지도.
 *
 * 배경에는 행정동 위험도를 옅게 깔고, 그 위에 경로를 그린다.
 * 배경이 진하면 경로선이 묻히고, 없으면 "왜 이 길로 우회하는지"가 안 보인다.
 * 그래서 배경은 fillOpacity 0.45 정도로만 둔다.
 */
export default function RouteMap({
  result,
  dongRisks,
  selectedRouteId,
}: RouteMapProps) {
  const riskById = useMemo(
    () => new Map(dongRisks.map((r) => [r.areaId, r])),
    [dongRisks],
  );

  const style = (feature?: Feature<Geometry, DongFeatureProps>): PathOptions => {
    const risk = feature ? riskById.get(feature.properties.id) : undefined;
    return {
      fillColor: risk ? scoreColor(risk.score) : '#e2e7ec',
      // 배경이 진하면 경로선이 묻힌다. 겨울처럼 시 전역이 붉은 날에도
      // 경로가 읽히도록 옅게 깐다.
      fillOpacity: 0.3,
      color: '#ffffff',
      weight: 0.8,
      interactive: false,
    };
  };

  // 선택되지 않은 경로를 먼저 그려서 선택된 경로가 위에 오게 한다
  const ordered = useMemo(() => {
    const others = result.options.filter((o) => o.id !== selectedRouteId);
    const selected = result.options.find((o) => o.id === selectedRouteId);
    return selected ? [...others, selected] : others;
  }, [result.options, selectedRouteId]);

  return (
    <MapContainer
      center={DAEJEON_CENTER}
      zoom={DAEJEON_ZOOM}
      minZoom={10}
      maxZoom={15}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains={['a', 'b', 'c', 'd']}
      />

      <GeoJSON data={DONG_GEOJSON as never} style={style as never} />

      {ordered.map((option) => (
        <RouteLine
          key={option.id}
          option={option}
          selected={option.id === selectedRouteId}
        />
      ))}

      <Endpoints result={result} />
      <FitRoute result={result} selectedRouteId={selectedRouteId} />
    </MapContainer>
  );
}

/**
 * 경로선.
 *
 * 선택된 경로는 구간별 위험도로 색을 나눠 칠한다.
 * "어느 구간이 나쁜가"가 경로 자체에서 읽혀야 하기 때문이다.
 * 선택되지 않은 경로는 회색 점선으로 존재만 표시한다.
 */
function RouteLine({ option, selected }: { option: RouteOption; selected: boolean }) {
  if (!selected) {
    const all = option.segments.flatMap((s) => s.path);
    return (
      <Polyline
        positions={all}
        pathOptions={{
          color: '#7c8895',
          weight: 3,
          opacity: 0.5,
          dashArray: '4 6',
        }}
      />
    );
  }

  return (
    <>
      {/* 외곽선 — 배경 위에서 경로가 확실히 보이게 */}
      <Polyline
        positions={option.segments.flatMap((s) => s.path)}
        pathOptions={{ color: '#ffffff', weight: 10, opacity: 1 }}
      />
      {option.segments.map((segment, i) => (
        <Polyline
          key={`${segment.areaId}-${i}`}
          positions={segment.path}
          pathOptions={{
            color: scoreColor(segment.effectiveScore),
            weight: 5.5,
            opacity: 1,
            lineCap: 'round',
          }}
        />
      ))}
    </>
  );
}

/** 출발·도착 표시 */
function Endpoints({ result }: { result: RouteResult }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    const markers: { remove: () => void }[] = [];

    import('leaflet').then((L) => {
      if (cancelled) return;

      const make = (
        coord: [number, number],
        label: string,
        text: string,
        bg: string,
      ) =>
        L.marker(coord, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'soomgil-endpoint',
            html: `<span style="background:${bg}"><b>${label}</b>${text}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(map);

      markers.push(make(result.origin.coord, '출발', result.origin.name, '#1b5b94'));
      markers.push(
        make(result.destination.coord, '도착', result.destination.name, '#14181d'),
      );
    });

    return () => {
      cancelled = true;
      for (const m of markers) m.remove();
    };
  }, [map, result]);

  return null;
}

/** 선택된 경로가 화면에 꽉 차게 맞춘다 */
function FitRoute({
  result,
  selectedRouteId,
}: {
  result: RouteResult;
  selectedRouteId: string;
}) {
  const map = useMap();

  useEffect(() => {
    const option =
      result.options.find((o) => o.id === selectedRouteId) ?? result.options[0];
    if (!option) return;

    const points = option.segments.flatMap((s) => s.path);
    if (points.length === 0) return;

    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled) return;
      map.fitBounds(L.latLngBounds(points), { padding: [45, 45], maxZoom: 14 });
    });

    return () => {
      cancelled = true;
    };
  }, [map, result, selectedRouteId]);

  return null;
}
