import type { Geometry, Position } from 'geojson';
import { DONG_GEOJSON } from '@/data/geo/dong';

/**
 * 경로 탐색용 격자.
 *
 * 실제 도로망 데이터(TMAP·카카오내비)는 인증키가 있어야 받을 수 있어서,
 * 프로토타입에서는 대전 전역에 격자를 깔고 그 위에서 길을 찾는다.
 * 도로를 정확히 따라가지는 않지만 "어느 지역을 지나가는가"는 정확하고,
 * 이 서비스가 보여주려는 것도 정확히 그것이다.
 *
 * 격자 노드 ↔ 행정동 매핑은 위험도와 무관하므로 한 번만 계산해서 캐시한다.
 * (요청마다 3,000개 노드 × 78개 폴리곤 점-내부 판정을 다시 하면 느리다)
 */

export interface GridNode {
  index: number;
  row: number;
  col: number;
  lat: number;
  lng: number;
  /** 이 노드가 속한 행정동 코드. 대전 밖이면 null */
  dongId: string | null;
}

export interface Grid {
  rows: number;
  cols: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  nodes: GridNode[];
  /** 대전 안에 있는 노드만 (탐색 대상) */
  walkable: Set<number>;
}

/** 격자 해상도 — 대전 전역을 약 550m 간격으로 덮는다 */
const ROWS = 56;
const COLS = 56;

let cached: Grid | null = null;

export function getGrid(): Grid {
  if (cached) return cached;

  const bbox = computeBbox();
  const nodes: GridNode[] = [];
  const walkable = new Set<number>();

  // 행정동별 bbox를 미리 구해두면 점-내부 판정 대부분을 건너뛸 수 있다
  const dongs = DONG_GEOJSON.features.map((f) => ({
    id: f.properties.id,
    geometry: f.geometry,
    bbox: geometryBbox(f.geometry),
  }));

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const lat = bbox.minLat + ((bbox.maxLat - bbox.minLat) * row) / (ROWS - 1);
      const lng = bbox.minLng + ((bbox.maxLng - bbox.minLng) * col) / (COLS - 1);

      let dongId: string | null = null;
      for (const dong of dongs) {
        if (
          lng < dong.bbox.minLng ||
          lng > dong.bbox.maxLng ||
          lat < dong.bbox.minLat ||
          lat > dong.bbox.maxLat
        ) {
          continue;
        }
        if (pointInGeometry(lng, lat, dong.geometry)) {
          dongId = dong.id;
          break;
        }
      }

      nodes.push({ index, row, col, lat, lng, dongId });
      if (dongId) walkable.add(index);
    }
  }

  cached = { rows: ROWS, cols: COLS, ...bbox, nodes, walkable };
  return cached;
}

/** 좌표 → 가장 가까운 격자 노드 (대전 안쪽 우선) */
export function nearestNode(grid: Grid, lat: number, lng: number): GridNode {
  let best = grid.nodes[0];
  let bestDist = Infinity;

  for (const node of grid.nodes) {
    // 대전 밖 노드는 출발/도착점이 될 수 없다
    if (!grid.walkable.has(node.index)) continue;
    const d = (node.lat - lat) ** 2 + (node.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}

/** 위경도 두 점 사이 거리 (m) — 대전 규모에서는 평면 근사로 충분 */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * 111_320;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos(midLat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/* ── 내부 ──────────────────────────────────────────────── */

function computeBbox() {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const feature of DONG_GEOJSON.features) {
    const b = geometryBbox(feature.geometry);
    minLat = Math.min(minLat, b.minLat);
    maxLat = Math.max(maxLat, b.maxLat);
    minLng = Math.min(minLng, b.minLng);
    maxLng = Math.max(maxLng, b.maxLng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

function geometryBbox(geometry: Geometry) {
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

/** Polygon / MultiPolygon의 모든 외곽선을 평평하게 편다 */
function ringsOf(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

/** ray casting */
function pointInGeometry(lng: number, lat: number, geometry: Geometry): boolean {
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
