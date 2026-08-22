import type { AreaRisk, DistrictId, RoadKind, RoadPoint, RouteSegment } from '@/types';
import { DONG_GEOJSON } from '@/data/geo/dong';
import { ROAD_KINDS, roadKindOf } from '@/lib/risk/road-exposure';
import {
  distanceM,
  geometryBbox,
  inBbox,
  lerpLatLng,
  pointInGeometry,
  type Bbox,
  type LatLng,
} from './geometry';

/**
 * 경로 좌표 → 행정동 매칭.
 *
 * TMAP이 주는 건 도로 폴리라인일 뿐이라 "어느 동을 지나가는지"는 우리가 판정해야 한다.
 * 경로를 일정 간격으로 샘플링하고, 각 샘플이 어느 행정동 폴리곤 안에 있는지
 * point-in-polygon으로 확인한다.
 *
 * 격자 경로(A*)는 노드마다 이미 dongId를 들고 있지만, 구간을 묶고 위험도를 매기는
 * 뒷부분은 완전히 같다. 그래서 buildSegments는 두 경로가 공유한다.
 */

/** 샘플 간격 — 이보다 짧게 스쳐 지나가는 동은 놓칠 수 있다 */
const SAMPLE_INTERVAL_M = 100;

/** 이보다 짧은 구간은 앞 구간에 합친다 (0분짜리 구간이 목록을 채우는 걸 막는다) */
const MIN_SEGMENT_M = 400;

/**
 * 경로 위의 한 점 — 위치 + 소속 행정동 + 그 지점의 실효 위험도.
 *
 * 도로 특성은 TMAP 경로에만 있다. 격자 근사 경로에는 실제 도로가 없어
 * null 로 남고, 그러면 도로유형 보정이 걸리지 않는다(계수 1).
 */
export interface AnnotatedPoint extends LatLng {
  dongId: string | null;
  risk: number;
  roadType?: number | null;
  facilityType?: number | null;
  roadName?: string | null;
  /** 이 점에 걸린 도로유형 보정 계수 */
  roadFactor?: number;
  /** 이 점에 걸린 street canyon 보정 계수 */
  canyonFactor?: number;
}

/* ── 행정동 조회 (bbox 프리필터 + 캐시) ─────────────────── */

interface DongEntry {
  id: string;
  name: string;
  districtId: DistrictId;
  geometry: (typeof DONG_GEOJSON)['features'][number]['geometry'];
  bbox: Bbox;
}

let dongCache: DongEntry[] | null = null;

function getDongs(): DongEntry[] {
  if (dongCache) return dongCache;
  dongCache = DONG_GEOJSON.features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    districtId: f.properties.districtId,
    geometry: f.geometry,
    bbox: geometryBbox(f.geometry),
  }));
  return dongCache;
}

/** 좌표가 속한 행정동 코드. 대전 밖이면 null */
export function findDongAt(lat: number, lng: number): string | null {
  for (const dong of getDongs()) {
    if (!inBbox(dong.bbox, lat, lng)) continue;
    if (pointInGeometry(lng, lat, dong.geometry)) return dong.id;
  }
  return null;
}

/** 좌표가 속한 자치구. 대전 밖이면 null */
export function findDistrictAt(lat: number, lng: number): DistrictId | null {
  for (const dong of getDongs()) {
    if (!inBbox(dong.bbox, lat, lng)) continue;
    if (pointInGeometry(lng, lat, dong.geometry)) return dong.districtId;
  }
  return null;
}

/** 행정동 코드 → 이름 */
export function dongNameMap(): Map<string, string> {
  return new Map(getDongs().map((d) => [d.id, d.name]));
}

/* ── 샘플링 ────────────────────────────────────────────── */

/**
 * 폴리라인을 일정 간격 이하로 촘촘하게 만든다.
 *
 * TMAP 경로는 직선 구간에서 점 간격이 수백 m까지 벌어진다. 그대로 판정하면
 * 그 사이에 잠깐 지나간 동을 통째로 놓친다. 원래 꼭짓점은 모두 보존하면서
 * 간격이 넓은 곳에만 중간점을 끼워 넣는다.
 */
export function densifyPath<T extends LatLng>(
  path: T[],
  intervalM = SAMPLE_INTERVAL_M,
): T[] {
  if (path.length < 2) return [...path];

  const out: T[] = [path[0]];

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const d = distanceM(a, b);

    if (d > intervalM) {
      const steps = Math.ceil(d / intervalM);
      /*
       * 끼워 넣는 중간점은 **앞 점의 속성**을 물려받는다.
       * a → b 구간을 걷는 동안의 도로 유형은 a 가 들고 있는 값이기 때문이다
       * (tmap.ts 의 parseRoute 가 그 규칙으로 좌표에 붙여 둔다).
       */
      for (let s = 1; s < steps; s++) {
        out.push({ ...a, ...lerpLatLng(a, b, s / steps) });
      }
    }
    out.push(b);
  }

  return out;
}

/**
 * 경로 좌표에 행정동과 위험도를 붙인다.
 *
 * @param riskAt 좌표 → 실효 위험도 (풍향·하천축 보정이 이미 반영된 값)
 */
export function annotatePath(
  path: (LatLng | RoadPoint)[],
  riskAt: (lat: number, lng: number) => number,
): AnnotatedPoint[] {
  const dense = densifyPath(path);

  // 같은 좌표를 반복 판정하지 않도록 소수점 4자리(약 11m)로 묶어 캐시한다
  const cache = new Map<string, string | null>();

  return dense.map((p) => {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    let dongId = cache.get(key);
    if (dongId === undefined) {
      dongId = findDongAt(p.lat, p.lng);
      cache.set(key, dongId);
    }
    return { ...p, dongId, risk: riskAt(p.lat, p.lng) };
  });
}

/* ── 구간 묶기 ─────────────────────────────────────────── */

/**
 * 경로를 행정동 단위 구간으로 묶는다.
 *
 * 좌표를 하나하나 보여주면 읽을 수 없다. "어느 동을 몇 분간 지나가는가"로
 * 묶어야 사용자가 판단할 수 있다.
 *
 * 구간 위험도는 그 구간이 지나는 **모든 샘플의 평균**이다. 시작점 하나만 쓰면
 * 같은 동 안에서 하천변을 따라가는 구간이 낮게 나오지 않는다.
 */
export function buildSegments(
  points: AnnotatedPoint[],
  speedMs: number,
  riskById: Map<string, AreaRisk>,
  names: Map<string, string>,
): RouteSegment[] {
  if (points.length < 2) return [];

  interface Draft extends RouteSegment {
    riskSamples: number[];
    /** 도로 유형별 누적 거리 — 대표 유형과 평균 계수를 뽑는 데 쓴다 */
    roadMeters: Map<RoadKind, number>;
    /** 계수 × 거리 누적 (거리 가중 평균용) */
    factorMeters: number;
    canyonMeters: number;
    weightedMeters: number;
  }

  /** 이 구간(prev → point)의 도로 유형을 앞 점에서 읽는다 */
  const addRoad = (draft: Draft, from: AnnotatedPoint, meters: number) => {
    const kind = roadKindOf(from.roadType);
    draft.roadMeters.set(kind, (draft.roadMeters.get(kind) ?? 0) + meters);
    draft.factorMeters += (from.roadFactor ?? 1) * meters;
    draft.canyonMeters += (from.canyonFactor ?? 1) * meters;
    draft.weightedMeters += meters;
  };

  const drafts: Draft[] = [];
  let current: Draft | null = null;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const areaId = point.dongId ?? 'unknown';

    if (!current || current.areaId !== areaId) {
      if (current) drafts.push(current);

      current = {
        areaId,
        areaName: names.get(areaId) ?? '대전 외곽',
        path: [[point.lat, point.lng]],
        distanceM: 0,
        durationSec: 0,
        areaScore: riskById.get(areaId)?.score ?? 0,
        effectiveScore: 0,
        roadFactor: 1,
        canyonFactor: 1,
        dominantRoad: 'unknown',
        roadDriver: 'unknown',
        riskSamples: [point.risk],
        roadMeters: new Map(),
        factorMeters: 0,
        canyonMeters: 0,
        weightedMeters: 0,
      };

      // 구간이 바뀌어도 선이 끊기지 않도록 직전 점을 시작점으로 잇는다
      if (i > 0) {
        const prev = points[i - 1];
        current.path.unshift([prev.lat, prev.lng]);
        const d = distanceM(prev, point);
        current.distanceM += d;
        current.durationSec += d / speedMs;
        addRoad(current, prev, d);
      }
      continue;
    }

    const prev = points[i - 1];
    const d = distanceM(prev, point);
    current.path.push([point.lat, point.lng]);
    current.distanceM += d;
    current.durationSec += d / speedMs;
    current.riskSamples.push(point.risk);
    addRoad(current, prev, d);
  }
  if (current) drafts.push(current);

  // 짧게 스쳐 지나가는 구간을 앞 구간에 합친다
  const merged: Draft[] = [];
  for (const draft of drafts) {
    const prev = merged[merged.length - 1];
    if (prev && draft.distanceM < MIN_SEGMENT_M) {
      prev.path = [...prev.path, ...draft.path];
      prev.distanceM += draft.distanceM;
      prev.durationSec += draft.durationSec;
      prev.riskSamples = [...prev.riskSamples, ...draft.riskSamples];
      prev.factorMeters += draft.factorMeters;
      prev.canyonMeters += draft.canyonMeters;
      prev.weightedMeters += draft.weightedMeters;
      for (const [kind, m] of draft.roadMeters) {
        prev.roadMeters.set(kind, (prev.roadMeters.get(kind) ?? 0) + m);
      }
      continue;
    }
    merged.push({ ...draft });
  }

  return merged.map(
    ({
      riskSamples,
      roadMeters,
      factorMeters,
      canyonMeters,
      weightedMeters,
      ...segment
    }) => ({
      ...segment,
      distanceM: Math.round(segment.distanceM),
      durationSec: Math.round(segment.durationSec),
      effectiveScore: round1(average(riskSamples)),
      roadFactor:
        weightedMeters > 0 ? Math.round((factorMeters / weightedMeters) * 100) / 100 : 1,
      canyonFactor:
        weightedMeters > 0 ? Math.round((canyonMeters / weightedMeters) * 100) / 100 : 1,
      dominantRoad: dominantKind(roadMeters),
      roadDriver: drivingKind(roadMeters),
    }),
  );
}

/** 거리를 가장 많이 차지한 도로 유형 */
function dominantKind(roadMeters: Map<RoadKind, number>): RoadKind {
  let best: RoadKind = 'unknown';
  let bestM = -1;
  for (const [kind, m] of roadMeters) {
    if (m > bestM) {
      best = kind;
      bestM = m;
    }
  }
  return best;
}

/**
 * 이 구간의 계수를 1에서 가장 많이 밀어낸 도로 유형.
 *
 * 거리 × |계수 − 1| 이 가장 큰 것을 고른다. 기준 유형(계수 1.00)과 유형 미상은
 * 기여가 0이라 절대 뽑히지 않는다 — 그래서 배지 이름과 계수 방향이 어긋나지 않는다.
 */
function drivingKind(roadMeters: Map<RoadKind, number>): RoadKind {
  let best: RoadKind = 'unknown';
  let bestWeight = 0;
  for (const [kind, m] of roadMeters) {
    const weight = Math.abs(ROAD_KINDS[kind].factor - 1) * m;
    if (weight > bestWeight) {
      best = kind;
      bestWeight = weight;
    }
  }
  return best;
}

/** 경로 전체의 체류시간 가중 노출 점수 */
export function exposureOfPath(
  points: AnnotatedPoint[],
  speedMs: number,
): { score: number; distanceM: number; durationSec: number } {
  if (points.length < 2) return { score: 0, distanceM: 0, durationSec: 0 };

  let weighted = 0;
  let totalTime = 0;
  let totalDist = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = distanceM(a, b);
    const t = d / speedMs;

    weighted += ((a.risk + b.risk) / 2) * t;
    totalTime += t;
    totalDist += d;
  }

  return {
    score: totalTime === 0 ? 0 : round1(weighted / totalTime),
    distanceM: Math.round(totalDist),
    durationSec: Math.round(totalTime),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
