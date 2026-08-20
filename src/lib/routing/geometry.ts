import type { Geometry, Position } from 'geojson';

/**
 * 공용 지오메트리 유틸.
 *
 * 격자 경로(grid.ts)와 실제 도로 경로(geo-match.ts)가 **같은 판정 함수**를 쓰도록
 * 여기로 모았다. 두 경로가 서로 다른 point-in-polygon 구현을 쓰면
 * "격자에서는 문화동인데 TMAP 경로에서는 대흥동"처럼 결과가 어긋날 수 있다.
 */

export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Polygon / MultiPolygon의 모든 외곽선을 평평하게 편다 */
export function ringsOf(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

export function geometryBbox(geometry: Geometry): Bbox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const ring of ringsOf(geometry)) {
    for (const [lng, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function inBbox(bbox: Bbox, lat: number, lng: number): boolean {
  return (
    lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat
  );
}

/** ray casting */
export function pointInGeometry(lng: number, lat: number, geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') return pointInPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

function pointInPolygon(lng: number, lat: number, polygon: Position[][]): boolean {
  // polygon[0] = 외곽선, 이후는 구멍
  if (!inRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (inRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/* ── 거리 ──────────────────────────────────────────────── */

/** 대전 규모(25km 남짓)에서는 평면 근사로 충분하다 */
export const LAT_TO_M = 111_320;
export const LNG_TO_M = 111_320 * Math.cos((36.35 * Math.PI) / 180);

export interface LatLng {
  lat: number;
  lng: number;
}

export function distanceM(a: LatLng, b: LatLng): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * LAT_TO_M;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos(midLat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** 두 점 사이를 t(0~1) 비율로 보간 */
export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
