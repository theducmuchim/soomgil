import type {
  AreaRisk,
  RiskSnapshot,
  RouteKind,
  RouteOption,
  RouteResult,
} from '@/types';
import type { Place } from '@/data/places';
import { levelFromScore } from '@/lib/risk/score';
import { buildNodeRiskMap, createRiskSampler } from '@/lib/risk/route-score';
import { findPath } from './astar';
import { getGrid, nearestNode, type GridNode } from './grid';
import {
  annotatePath,
  buildSegments,
  dongNameMap,
  exposureOfPath,
  type AnnotatedPoint,
} from './geo-match';
import { distanceM, LAT_TO_M, LNG_TO_M, type LatLng } from './geometry';
import { fetchPedestrianRoute, isTmapConfigured, type TmapRoute } from './tmap';

/**
 * 경로 계획.
 *
 * ── 두 가지 엔진 ────────────────────────────────────────
 * tmap : TMAP 보행자 경로 API로 **실제 도로**를 따라가는 경로를 받아온다.
 * grid : 대전 전역에 깐 약 550m 격자 위에서 A*로 경로를 만든다.
 *
 * 앱키(TMAP_APP_KEY)가 있으면 tmap을, 없거나 호출이 실패하면 grid를 쓴다.
 * 격자 엔진을 지우지 않고 남겨둔 이유는 두 가지다.
 *   1. 앱키 발급/승인을 기다리는 동안에도 화면이 완전하게 돌아가야 한다
 *   2. 발표 중 TMAP이 죽어도 서비스가 빈 화면이 되면 안 된다
 *
 * 중요한 건 **위험도 계산이 두 엔진에서 완전히 동일하다**는 점이다.
 * 경로 좌표만 다를 뿐, 풍향 보정·하천축 보정·체류시간 가중 노출량은
 * 같은 코드(lib/risk/route-score.ts + geo-match.ts)를 통과한다.
 */

export type RouteEngine = 'tmap' | 'grid';

export type TravelMode = 'walk' | 'bike' | 'car';

export const TRAVEL_MODES: Record<
  TravelMode,
  { label: string; speedMs: number; note: string }
> = {
  walk: { label: '도보', speedMs: 1.25, note: '시속 4.5km' },
  bike: { label: '자전거', speedMs: 4.2, note: '시속 15km' },
  car: { label: '자동차', speedMs: 8.3, note: '도심 평균 시속 30km' },
};

export interface PlanRoutesArgs {
  origin: Place;
  destination: Place;
  snapshot: RiskSnapshot;
  dongRisks: AreaRisk[];
  mode?: TravelMode;
}

export async function planRoutes(args: PlanRoutesArgs): Promise<RouteResult> {
  const { origin, destination, snapshot, dongRisks, mode = 'walk' } = args;

  // 바람은 출발지 자치구 값을 대표로 쓴다. 대전 안에서 풍향은 구별로 크게 다르지 않고,
  // 지점마다 다른 바람을 쓰면 보정 결과가 들쭉날쭉해져 오히려 읽기 어려워진다.
  const wind =
    snapshot.districts.find((d) => d.areaId === origin.districtId)?.wind ??
    snapshot.districts[0].wind;

  const riskMap = buildNodeRiskMap(dongRisks, wind);
  const riskAt = createRiskSampler(riskMap);

  const context: PlanContext = {
    origin,
    destination,
    mode,
    speedMs: TRAVEL_MODES[mode].speedMs,
    riskAt,
    riskById: new Map(dongRisks.map((r) => [r.areaId, r])),
    names: dongNameMap(),
  };

  if (isTmapConfigured()) {
    try {
      return await planWithTmap(context, snapshot.baseTime);
    } catch (error) {
      // 발표 중 TMAP이 죽어도 화면이 비면 안 된다. 격자로 떨어지되 경고는 남긴다.
      console.warn(
        '[soomgil] TMAP 보행자 경로 호출 실패 — 격자 경로로 대체합니다.',
        error,
      );
    }
  }

  return planWithGrid(context, snapshot.baseTime);
}

interface PlanContext {
  origin: Place;
  destination: Place;
  mode: TravelMode;
  speedMs: number;
  riskAt: (lat: number, lng: number) => number;
  riskById: Map<string, AreaRisk>;
  names: Map<string, string>;
}

/* ── TMAP 엔진 ─────────────────────────────────────────── */

/**
 * 경유지 후보를 만들 때 직선거리의 몇 %만큼 옆으로 벌릴지.
 * 너무 작으면 같은 길이 나오고, 너무 크면 말이 안 되는 우회가 된다.
 */
const DETOUR_RATIOS = [0.15, 0.3];
const MIN_DETOUR_M = 350;
const MAX_DETOUR_M = 2500;

/** TMAP에 보낼 경로 후보 수 (직선 1 + 우회 2) */
const TMAP_CANDIDATES = 2;

async function planWithTmap(ctx: PlanContext, baseTime: string): Promise<RouteResult> {
  const origin: LatLng = { lat: ctx.origin.coord[0], lng: ctx.origin.coord[1] };
  const destination: LatLng = {
    lat: ctx.destination.coord[0],
    lng: ctx.destination.coord[1],
  };

  const waypoints = pickDetourWaypoints(origin, destination, ctx.riskAt);

  /*
   * TMAP 보행자 경로는 대안 경로를 여러 개 주지 않는다.
   * 그래서 경유지를 조금씩 다르게 준 후보를 따로 받아 비교한다.
   * 직선(경유지 없음) 경로는 항상 포함한다 — 비교 기준선이기 때문이다.
   */
  const requests: { waypoint: LatLng | null; promise: Promise<TmapRoute> }[] = [
    {
      waypoint: null,
      promise: fetchPedestrianRoute({
        origin,
        destination,
        originName: ctx.origin.name,
        destinationName: ctx.destination.name,
      }),
    },
    ...waypoints.map((waypoint) => ({
      waypoint,
      promise: fetchPedestrianRoute({
        origin,
        destination,
        originName: ctx.origin.name,
        destinationName: ctx.destination.name,
        waypoints: [waypoint],
      }),
    })),
  ];

  const settled = await Promise.allSettled(requests.map((r) => r.promise));

  // 기준선(직선 경로)이 실패하면 TMAP 자체가 안 되는 상황이라 격자로 넘긴다
  if (settled[0].status === 'rejected') {
    throw settled[0].reason;
  }

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;

    const route = result.value;
    const signature = pathSignature(route.path);
    if (seen.has(signature)) return; // 경유지를 줬는데 같은 길이 나온 경우
    seen.add(signature);

    const points = annotatePath(route.path, ctx.riskAt);
    const stats = exposureOfPath(points, ctx.speedMs);

    candidates.push({
      isBaseline: requests[i].waypoint === null,
      points,
      // 도보는 TMAP이 계산한 시간을 쓴다. 횡단보도·계단·경사가 반영돼 있어
      // 거리 ÷ 평균속도보다 정확하다. 다른 수단은 우리 속도 상수로 환산한다.
      distanceM: route.totalDistanceM || stats.distanceM,
      durationSec:
        ctx.mode === 'walk' && route.totalTimeSec > 0
          ? route.totalTimeSec
          : Math.round((route.totalDistanceM || stats.distanceM) / ctx.speedMs),
      exposureScore: stats.score,
    });
  });

  if (candidates.length === 0) throw new Error('TMAP 경로 후보가 없습니다');

  return assemble(candidates, ctx, baseTime, 'tmap');
}

/**
 * 우회 경유지 후보를 고른다.
 *
 * 출발-도착 직선의 중점에서 수직으로 좌우로 벌린 지점들을 만들고,
 * 그 경로가 지날 법한 구간의 위험도를 미리 훑어 낮은 쪽 N개만 고른다.
 * TMAP 호출은 유료 자원이라, 아무 방향으로나 던져보는 대신
 * 우리가 이미 가진 위험도 지도로 먼저 걸러낸다.
 */
function pickDetourWaypoints(
  origin: LatLng,
  destination: LatLng,
  riskAt: (lat: number, lng: number) => number,
): LatLng[] {
  const direct = distanceM(origin, destination);
  if (direct < 500) return []; // 아주 가까우면 우회가 의미 없다

  // 직선에 수직인 단위 벡터 (미터 기준)
  const dx = (destination.lng - origin.lng) * LNG_TO_M;
  const dy = (destination.lat - origin.lat) * LAT_TO_M;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  const mid: LatLng = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };

  const scored: { point: LatLng; risk: number }[] = [];

  for (const ratio of DETOUR_RATIOS) {
    const offsetM = clamp(direct * ratio, MIN_DETOUR_M, MAX_DETOUR_M);
    for (const sign of [1, -1]) {
      const point: LatLng = {
        lat: mid.lat + (perpY * offsetM * sign) / LAT_TO_M,
        lng: mid.lng + (perpX * offsetM * sign) / LNG_TO_M,
      };
      scored.push({ point, risk: probeRisk(origin, point, destination, riskAt) });
    }
  }

  return scored
    .sort((a, b) => a.risk - b.risk)
    .slice(0, TMAP_CANDIDATES)
    .map((s) => s.point);
}

/** 출발 → 경유지 → 도착을 직선으로 이었을 때의 평균 위험도 (사전 선별용) */
function probeRisk(
  origin: LatLng,
  waypoint: LatLng,
  destination: LatLng,
  riskAt: (lat: number, lng: number) => number,
): number {
  const samples: number[] = [];
  const legs: [LatLng, LatLng][] = [
    [origin, waypoint],
    [waypoint, destination],
  ];

  for (const [a, b] of legs) {
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const risk = riskAt(a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t);
      // 대전 밖(위험도 0)은 평균을 왜곡하므로 뺀다
      if (risk > 0) samples.push(risk);
    }
  }

  if (samples.length === 0) return Infinity;
  return samples.reduce((s, v) => s + v, 0) / samples.length;
}

/* ── 격자 엔진 (mock / 폴백) ───────────────────────────── */

/**
 * 세 가지 격자 경로안.
 *
 * riskWeight     : 위험 지역을 얼마나 피하는가
 * straightWeight : 출발-도착 직선에 얼마나 붙는가 (간선도로 근사)
 *
 * 8방향 격자에서는 계단형 경로들의 길이가 기하학적으로 같아서, 위험 가중치만
 * 바꾸면 거리는 그대로인데 노출만 줄어드는 결과가 나온다. 직선 선호도와
 * 이탈거리 기반 속도 저하를 함께 움직여야 시간↔노출 맞바꿈이 표현된다.
 */
const GRID_PLANS: { riskWeight: number; straightWeight: number }[] = [
  { riskWeight: 0, straightWeight: 2.2 }, // 최단(기준선) — 먼저 탐색해 중복 제거에서 살아남게 한다
  { riskWeight: 2.5, straightWeight: 0.55 },
  { riskWeight: 9, straightWeight: 0 },
];

/** 직선에서 벗어날수록 이면도로를 지나 평균 속도가 떨어진다 */
const DEVIATION_SLOWDOWN = 0.34;

function planWithGrid(ctx: PlanContext, baseTime: string): RouteResult {
  const grid = getGrid();
  const start = nearestNode(grid, ctx.origin.coord[0], ctx.origin.coord[1]);
  const goal = nearestNode(grid, ctx.destination.coord[0], ctx.destination.coord[1]);

  // A* 비용에 쓸 위험도 배열 — 샘플러와 같은 값을 격자 인덱스로 읽는다
  const effective = new Float32Array(grid.nodes.length);
  for (const node of grid.nodes) effective[node.index] = ctx.riskAt(node.lat, node.lng);

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const plan of GRID_PLANS) {
    const path = findPath(grid, start.index, goal.index, effective, plan);
    if (path.length < 2) continue;

    const signature = path.map((n) => n.index).join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);

    const speed = ctx.speedMs / (1 + DEVIATION_SLOWDOWN * averageDeviationKm(path, start, goal));
    const points: AnnotatedPoint[] = path.map((node) => ({
      lat: node.lat,
      lng: node.lng,
      dongId: node.dongId,
      risk: effective[node.index],
    }));
    const stats = exposureOfPath(points, speed);

    candidates.push({
      isBaseline: plan.riskWeight === 0,
      points,
      distanceM: stats.distanceM,
      durationSec: stats.durationSec,
      exposureScore: stats.score,
    });
  }

  return assemble(candidates, ctx, baseTime, 'grid');
}

/** 경로가 출발-도착 직선에서 평균 몇 km 벗어나는가 */
function averageDeviationKm(path: GridNode[], start: GridNode, goal: GridNode): number {
  const bx = (goal.lng - start.lng) * LNG_TO_M;
  const by = (goal.lat - start.lat) * LAT_TO_M;
  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return 0;

  let total = 0;
  for (const node of path) {
    const px = (node.lng - start.lng) * LNG_TO_M;
    const py = (node.lat - start.lat) * LAT_TO_M;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
    const dx = px - t * bx;
    const dy = py - t * by;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / path.length / 1000;
}

/* ── 공통: 후보 → 화면용 경로안 ────────────────────────── */

interface Candidate {
  /** 우회 없이 받은 기준 경로인지 */
  isBaseline: boolean;
  points: AnnotatedPoint[];
  distanceM: number;
  durationSec: number;
  exposureScore: number;
}

/**
 * 구간 시간을 계산할 때 쓸 속도.
 *
 * 경로 전체 시간은 엔진마다 다르게 나온다. TMAP 도보는 횡단보도·계단이 반영된
 * 자체 계산값을 쓰고, 격자 경로는 직선 이탈에 따른 속도 저하를 적용한다.
 * 구간 시간을 기본 속도로 따로 계산하면 구간 합계가 총 시간과 안 맞는다.
 * 총 거리와 총 시간에서 역산한 실효 속도를 써서 항상 맞아떨어지게 한다.
 */
function segmentSpeedOf(candidate: Candidate, fallbackMs: number): number {
  if (candidate.durationSec <= 0 || candidate.distanceM <= 0) return fallbackMs;
  return candidate.distanceM / candidate.durationSec;
}

/** 이 이상 좋아져야 "더 안전한 길"이라고 부른다 (%) */
const MEANINGFUL_IMPROVEMENT = 0.5;

function assemble(
  candidates: Candidate[],
  ctx: PlanContext,
  baseTime: string,
  engine: RouteEngine,
): RouteResult {
  const baseline = candidates.find((c) => c.isBaseline) ?? candidates[0];

  /*
   * 라벨 붙이기.
   *
   * 기준 경로(우회 없음)는 항상 '최단 시간'이다. "이 길로 가면 노출이 몇 % 줄어드는가"의
   * 분모이므로 화면에서 사라지면 안 된다.
   * 나머지 후보 중 노출이 가장 낮고 기준선보다 의미 있게 나은 것이 '가장 안전한 길'이다.
   * 개선이 없으면 '가장 안전한 길'을 만들지 않는다 — 없는 이득을 있다고 말하지 않기 위해서다.
   * (화면은 이때 "경로별 차이가 크지 않습니다"라고 안내한다)
   */
  const alternatives = candidates
    .filter((c) => c !== baseline)
    .sort((a, b) => a.exposureScore - b.exposureScore);

  const improves = (c: Candidate) =>
    baseline.exposureScore > 0 &&
    ((c.exposureScore - baseline.exposureScore) / baseline.exposureScore) * 100 <
      -MEANINGFUL_IMPROVEMENT;

  const labelled: { candidate: Candidate; kind: RouteKind; label: string }[] = [];

  const safest = alternatives.find(improves);
  if (safest) labelled.push({ candidate: safest, kind: 'safest', label: '가장 안전한 길' });

  for (const alt of alternatives) {
    if (alt === safest) continue;
    labelled.push({ candidate: alt, kind: 'balanced', label: '균형' });
  }

  labelled.push({ candidate: baseline, kind: 'fastest', label: '최단 시간' });

  // 화면에는 안전한 순으로 보여준다
  const order: RouteKind[] = ['safest', 'balanced', 'fastest'];
  labelled.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  const options: RouteOption[] = labelled.map(({ candidate, kind, label }, i) => {
    const deltaPct =
      baseline.exposureScore > 0
        ? round1(
            ((candidate.exposureScore - baseline.exposureScore) /
              baseline.exposureScore) *
              100,
          )
        : 0;

    return {
      // 같은 kind가 둘 이상일 수 있어(균형 2개) 인덱스를 붙여 고유하게 만든다
      id: `${kind}-${i}`,
      kind,
      label,
      segments: buildSegments(
        candidate.points,
        segmentSpeedOf(candidate, ctx.speedMs),
        ctx.riskById,
        ctx.names,
      ),
      distanceM: candidate.distanceM,
      durationSec: candidate.durationSec,
      exposureScore: candidate.exposureScore,
      level: levelFromScore(candidate.exposureScore),
      exposureDeltaPct: deltaPct,
    };
  });

  return {
    origin: { name: ctx.origin.name, coord: ctx.origin.coord },
    destination: { name: ctx.destination.name, coord: ctx.destination.coord },
    options,
    baseTime,
    engine,
  };
}

/** 두 경로가 사실상 같은 길인지 판정하기 위한 지문 */
function pathSignature(path: LatLng[]): string {
  const picks = 12;
  const parts: string[] = [];
  for (let i = 0; i < picks; i++) {
    const p = path[Math.floor((path.length - 1) * (i / (picks - 1)))];
    parts.push(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`);
  }
  return parts.join('|');
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
