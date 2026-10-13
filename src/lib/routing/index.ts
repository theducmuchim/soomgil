import type {
  AreaRisk,
  RiskSnapshot,
  RouteGuide,
  RouteKind,
  RouteNeedId,
  RouteOption,
  RouteResult,
} from '@/types';
import type { Place } from '@/data/places';
import { levelFromScore } from '@/lib/risk/score';
import { buildNodeRiskMap, createRiskSampler } from '@/lib/risk/route-score';
import { createRoadAdjuster } from '@/lib/risk/road-exposure';
import { createShadeAdjuster, shadeAt } from '@/lib/risk/shade';
import { isNightAt, lightingAt } from '@/lib/risk/lighting';
import { corridorFactor } from '@/lib/risk/corridors';
import { canyonAt } from '@/data/buildings';
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
import {
  fetchPedestrianRoute,
  isTmapConfigured,
  type TmapGuide,
  type TmapSearchOption,
} from './tmap';

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
    at: new Date(snapshot.baseTime),
    night: isNightAt(new Date(snapshot.baseTime)),
    speedMs: TRAVEL_MODES[mode].speedMs,
    riskAt,
    adjustRoad: createRoadAdjuster(dongRisks),
    adjustShade: createShadeAdjuster(dongRisks, new Date(snapshot.baseTime)),
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
  /** 기준 시각 — 그늘과 조도가 모두 이 시각의 태양 위치에 달려 있다 */
  at: Date;
  /** 이 시각이 밤인가 — 조도 니즈를 꺼낼지 결정한다 */
  night: boolean;
  speedMs: number;
  riskAt: (lat: number, lng: number) => number;
  /** 도로유형 보정 — 경로 위 점마다 교통 오염물질 몫에만 계수를 건다 */
  adjustRoad: ReturnType<typeof createRoadAdjuster>;
  /** 그림자 보정 — 체감온도 몫에만. 기준 시각의 태양 위치를 쓴다 */
  adjustShade: ReturnType<typeof createShadeAdjuster>;
  riskById: Map<string, AreaRisk>;
  names: Map<string, string>;
}

/**
 * 도로유형 보정을 경로 전체에 적용한다.
 *
 * 이 보정만 지점이 아니라 **경로**에 걸린다. 위험도 지도는 좌표만 알지
 * 그 자리를 어떤 길로 지나가는지는 모르기 때문이다. 같은 좌표라도 큰길로
 * 지나가느냐 공원길로 지나가느냐에 따라 값이 달라지는 유일한 단계다.
 *
 * 그래서 격자 샘플러(riskAt)가 아니라 경로 주석 단계에서 따로 건다.
 */
function applyRoadExposure(
  points: AnnotatedPoint[],
  adjustRoad: PlanContext['adjustRoad'],
  adjustShade: PlanContext['adjustShade'],
): AnnotatedPoint[] {
  return points.map((point) => {
    const road = adjustRoad(point);

    /*
     * 그림자 보정은 도로 보정 **뒤에** 건다.
     *
     * 순서가 결과를 바꾸지는 않는다(둘 다 곱셈이고 서로 다른 지표의 몫에
     * 걸린다). 다만 각 단계가 무엇을 받아 무엇을 내놓는지 읽히도록
     * 체인을 한 방향으로 세워 둔다.
     */
    const shade = adjustShade({ ...point, risk: road.risk });

    return {
      ...point,
      risk: shade.risk,
      roadFactor: road.roadFactor,
      canyonFactor: road.canyonFactor,
      shadeFraction: shade.shadeFraction,
      shadeFactor: shade.factor,
    };
  });
}

/* ── TMAP 엔진 ─────────────────────────────────────────── */

/**
 * 경유지 후보를 만들 때 직선거리의 몇 %만큼 옆으로 벌릴지.
 * 너무 작으면 같은 길이 나오고, 너무 크면 말이 안 되는 우회가 된다.
 */
const DETOUR_RATIOS = [0.18, 0.34, 0.5];
const MIN_DETOUR_M = 350;
const MAX_DETOUR_M = 2500;

/**
 * TMAP에 보낼 경로 후보.
 *
 * ── 왜 늘렸나 ───────────────────────────────────────────
 * 예전에는 '추천 / 최단 / 최단+계단제외 / 저위험 우회' 넷이었다. 그런데
 * 앞의 셋은 **전부 시간을 줄이는 방향**이라 결국 같은 길이 나온다. 실제로
 * 돌려 보면 소요시간이 1~2% 안에 몰리고, 그래서 '빠른 길'도 '골목길'도
 * 문턱을 넘지 못해 죄다 '추천 경로'로 떨어졌다.
 *
 * 후보가 다양해야 니즈가 갈린다. 그래서 두 가지를 더한다.
 *   1. searchOption '4' (대로우선) — 지금까지 한 번도 쓰지 않던 값이다.
 *      큰길만 골라 가는 길이라 나머지와 성격이 정반대다. 밤에는 이게
 *      '밝은 길'이 되고, 낮에는 '피해야 할 길'이 된다.
 *   2. 경유지를 **목적별로** 고른다. 예전에는 저위험 지점 하나만 봤는데,
 *      이제 그늘·골목·조도 각각에 맞는 경유지를 따로 찾아 보낸다.
 */
const TMAP_VARIANTS: {
  searchOption: TmapSearchOption;
  /** 이 후보를 만들 때 쓸 경유지 목적 (없으면 경유지 없음) */
  detourFor?: DetourObjective;
  isBaseline: boolean;
}[] = [
  // 추천 경로 — 사용자가 아무 앱에서나 받게 될 기본 경로이므로 비교 기준선으로 쓴다
  { searchOption: '0', isBaseline: true },
  { searchOption: '10', isBaseline: false }, // 최단거리
  { searchOption: '4', isBaseline: false }, // 대로우선 — 밤에 밝은 길 후보
  { searchOption: '30', detourFor: 'clean', isBaseline: false }, // 저위험 우회
  { searchOption: '0', detourFor: 'shade', isBaseline: false }, // 그늘 우회
  { searchOption: '0', detourFor: 'quiet', isBaseline: false }, // 골목 우회
];

/**
 * 경유지를 무엇을 기준으로 고를 것인가.
 *
 * TMAP은 "그늘진 길로 안내해 줘"를 받아주지 않는다. 우리가 할 수 있는 건
 * **그늘이 많을 법한 지점을 경유지로 찍어 보내는 것**뿐이다. 그래서 이건
 * 지시가 아니라 유도이고, 실제로 그늘이 많은지는 받아온 경로를 다시 재서
 * 판정한다 (assignNeeds). 유도가 실패하면 그 후보는 그냥 라벨을 못 받는다.
 */
type DetourObjective = 'clean' | 'shade' | 'quiet';

async function planWithTmap(ctx: PlanContext, baseTime: string): Promise<RouteResult> {
  const origin: LatLng = { lat: ctx.origin.coord[0], lng: ctx.origin.coord[1] };
  const destination: LatLng = {
    lat: ctx.destination.coord[0],
    lng: ctx.destination.coord[1],
  };

  const detours = pickDetourWaypoints(origin, destination, ctx.riskAt, ctx.at);

  const variants = TMAP_VARIANTS.filter(
    // 경유지를 못 고른 목적(너무 가까운 구간, 건물 데이터 없음 등)은 건너뛴다
    (v) => !v.detourFor || detours[v.detourFor] !== null,
  );

  const settled = await Promise.allSettled(
    variants.map((variant) =>
      fetchPedestrianRoute({
        origin,
        destination,
        originName: ctx.origin.name,
        destinationName: ctx.destination.name,
        searchOption: variant.searchOption,
        waypoints: variant.detourFor ? [detours[variant.detourFor]!] : undefined,
      }),
    ),
  );

  // 기준 경로가 실패하면 TMAP 자체가 안 되는 상황이라 격자로 넘긴다
  if (settled[0].status === 'rejected') {
    throw settled[0].reason;
  }

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;

    const route = result.value;
    const signature = pathSignature(route.path);
    if (seen.has(signature)) return; // 다른 옵션인데 같은 길이 나온 경우
    seen.add(signature);

    const points = applyRoadExposure(
      annotatePath(route.path, ctx.riskAt),
      ctx.adjustRoad,
      ctx.adjustShade,
    );
    const stats = exposureOfPath(points, ctx.speedMs);

    candidates.push({
      isBaseline: variants[i].isBaseline,
      points,
      // 도보는 TMAP이 계산한 시간을 쓴다. 횡단보도·계단·경사가 반영돼 있어
      // 거리 ÷ 평균속도보다 정확하다. 다른 수단은 우리 속도 상수로 환산한다.
      distanceM: route.totalDistanceM || stats.distanceM,
      durationSec:
        ctx.mode === 'walk' && route.totalTimeSec > 0
          ? route.totalTimeSec
          : Math.round((route.totalDistanceM || stats.distanceM) / ctx.speedMs),
      exposureScore: stats.score,
      shadeFraction: stats.shadeFraction,
      roadFactor: stats.roadFactor,
      roadWidthM: stats.roadWidthM,
      lighting: lightingOfPath(points),
      guides: toRouteGuides(route.guides),
    });
  });

  if (candidates.length === 0) throw new Error('TMAP 경로 후보가 없습니다');

  return assemble(candidates, ctx, baseTime, 'tmap');
}

/** 경로 전체의 야간 조도 추정 (거리 가중 평균) */
function lightingOfPath(points: AnnotatedPoint[]): number {
  if (points.length < 2) return 0;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = distanceM(a, b);
    weighted += ((lightingAt(a) + lightingAt(b)) / 2) * d;
    total += d;
  }
  return total === 0 ? 0 : weighted / total;
}

/**
 * 목적별 우회 경유지를 고른다.
 *
 * 출발-도착 직선의 중점에서 수직으로 좌우로 벌린 지점들을 만들고, 그 경로가
 * 지날 법한 구간을 미리 훑어 목적에 가장 맞는 지점을 하나씩 고른다.
 * TMAP 호출은 유료 자원이라, 아무 방향으로나 던져보는 대신 우리가 이미 가진
 * 위험도·건물·하천 데이터로 먼저 걸러낸다.
 *
 * 좌우로만 벌리지 않고 비율을 셋(18% · 34% · 50%)으로 늘린 이유는, 작은
 * 우회는 결국 원래 길과 같은 결과가 나오기 때문이다. 크게 벌린 후보가 있어야
 * 성격이 다른 길이 나온다.
 */
function pickDetourWaypoints(
  origin: LatLng,
  destination: LatLng,
  riskAt: (lat: number, lng: number) => number,
  at: Date,
): Record<DetourObjective, LatLng | null> {
  const empty = { clean: null, shade: null, quiet: null };
  const direct = distanceM(origin, destination);
  if (direct < 500) return empty; // 아주 가까우면 우회가 의미 없다

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

  const points: LatLng[] = [];
  for (const ratio of DETOUR_RATIOS) {
    const offsetM = clamp(direct * ratio, MIN_DETOUR_M, MAX_DETOUR_M);
    for (const sign of [1, -1]) {
      points.push({
        lat: mid.lat + (perpY * offsetM * sign) / LAT_TO_M,
        lng: mid.lng + (perpX * offsetM * sign) / LNG_TO_M,
      });
    }
  }

  /** 출발 → 경유지 → 도착 직선 위를 훑어 지표 하나를 평균낸다 */
  const probe = (waypoint: LatLng, sample: (lat: number, lng: number) => number | null) => {
    const values: number[] = [];
    const legs: [LatLng, LatLng][] = [
      [origin, waypoint],
      [waypoint, destination],
    ];
    for (const [a, b] of legs) {
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const v = sample(a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t);
        if (v !== null) values.push(v);
      }
    }
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  };

  const bestBy = (
    sample: (lat: number, lng: number) => number | null,
    higherIsBetter: boolean,
  ): LatLng | null => {
    let best: LatLng | null = null;
    let bestValue = higherIsBetter ? -Infinity : Infinity;
    for (const point of points) {
      const v = probe(point, sample);
      if (v === null) continue;
      if (higherIsBetter ? v > bestValue : v < bestValue) {
        bestValue = v;
        best = point;
      }
    }
    return best;
  };

  return {
    // 대전 밖(위험도 0)은 평균을 왜곡하므로 뺀다
    clean: bestBy((lat, lng) => {
      const r = riskAt(lat, lng);
      return r > 0 ? r : null;
    }, false),
    // 그늘 — 건물이 만드는 그림자 비율이 높은 쪽
    shade: bestBy((lat, lng) => shadeAt(lat, lng, at)?.shadeFraction ?? null, true),
    /*
     * 골목 — 건물은 있되 큰길에서 떨어진 곳.
     * 건폐율을 그대로 쓰면 도심 한복판(=대로변)이 뽑힌다. 건물이 있으면서도
     * 하천·공원 쪽으로 치우친 지점을 고르려고 하천 근접도를 더해 준다.
     */
    quiet: bestBy((lat, lng) => {
      const cell = canyonAt(lat, lng);
      if (!cell) return null;
      return cell.builtRatio + Math.max(0, 1 - corridorFactor(lat, lng)) * 2;
    }, true),
  };
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
  /*
   * 직선을 아주 싫어하는 안.
   *
   * 위험 가중치는 중간인데 직선 선호를 음수로 둬서 간선도로를 벗어나게 만든다.
   * 결과적으로 이면도로·골목을 타는 경로가 나온다 — TMAP 쪽의 '골목 우회'
   * 후보와 같은 자리를 격자에서 채운다.
   */
  { riskWeight: 3.5, straightWeight: -0.8 },
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
    /*
     * 격자 경로도 도로·그늘 보정을 통과시킨다.
     *
     * 예전에는 TMAP 경로에만 걸었다. 격자 점에는 도로 종류 정보가 없어서
     * 도로 보정은 어차피 1(모름)로 떨어지지만, **그늘은 건물 격자와 태양
     * 위치만으로 계산되므로 격자 경로에서도 그대로 나온다**. 이걸 빼 두면
     * TMAP이 죽어 격자로 떨어졌을 때만 그늘 정보가 사라져, 화면에서
     * 경로 성격 비교가 통째로 비어 버린다.
     */
    const points = applyRoadExposure(
      path.map<AnnotatedPoint>((node) => ({
        lat: node.lat,
        lng: node.lng,
        dongId: node.dongId,
        risk: effective[node.index],
      })),
      ctx.adjustRoad,
      ctx.adjustShade,
    );
    const stats = exposureOfPath(points, speed);

    candidates.push({
      isBaseline: plan.riskWeight === 0,
      points,
      distanceM: stats.distanceM,
      durationSec: stats.durationSec,
      exposureScore: stats.score,
      shadeFraction: stats.shadeFraction,
      roadFactor: stats.roadFactor,
      roadWidthM: stats.roadWidthM,
      lighting: lightingOfPath(points),
      // 격자 경로는 실제 도로가 아니라 회전 안내를 만들 수 없다.
      // 없는 안내를 지어내면 그 길을 실제로 걸을 수 없다.
      guides: [],
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
  /** 그늘을 만날 비율 0~1 */
  shadeFraction: number;
  /** 도로유형 보정 평균 — 낮을수록 큰길에서 떨어져 걷는다 */
  roadFactor: number;
  /** 평균 도로 폭 (m) — 작을수록 골목길 위주 */
  roadWidthM: number;
  /** 야간 조도 추정 0~1 — 밤에만 쓴다 */
  lighting: number;
  /** 턴바이턴 안내 — TMAP 경로에만 있다 */
  guides: RouteGuide[];
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

/*
 * 니즈별 "의미 있는 차이"의 문턱.
 *
 * 문턱을 두는 이유는 하나다 — **차이가 없는데 있다고 말하지 않기 위해서**다.
 * 같은 출발-도착 사이의 후보들은 결국 같은 동네를 지나서, 노출 점수가 소수점
 * 단위로만 갈리는 일이 흔하다. 그때 "가장 안전한 길"이라고 써 붙이면 사람은
 * 없는 이득을 보고 우회를 택하게 된다.
 *
 * 각 값은 "이 정도는 벌어져야 사람이 결정을 바꿀 만하다"의 선이다.
 */
const NEED_THRESHOLDS = {
  /** 노출 점수 상대 개선 (%) */
  clean: 0.5,
  /*
   * 그늘 비율 절대 차이 (0~1).
   *
   * 5%p 에서 2%p 로 내렸다. 실측에서 후보들의 그늘 비율이 0.146~0.170 에
   * 걸쳐 있었다 — 폭이 2.4%p 다. 5%p 는 이 도시의 건물 밀도에서 사실상
   * 도달할 수 없는 문턱이었다. 6km 경로면 2%p 는 120m 만큼의 차이다.
   */
  shade: 0.02,
  /*
   * 평균 도로 폭 상대 차이 (%).
   *
   * 12% 면 평균 20m(로 등급)와 17.6m 의 차이다. 도로명 등급이 대로 40 · 로 20 ·
   * 길 10 이라, 'OO길' 구간이 경로의 4분의 1만 늘어도 넘는 값이다.
   */
  quiet: 12,
  /*
   * 소요시간 상대 차이 (%).
   *
   * 5% 에서 4% 로 내렸다. 도보 20분 경로면 48초 차이인데, 실제로 후보들이
   * 이 근처에 몰려서 '가장 빨리 가는 길'이 한 번도 안 붙었다. 1분 가까운
   * 차이는 사람이 체감하는 크기다.
   */
  fast: 4,
  /*
   * 야간 조도 절대 차이 (0~1).
   *
   * 6%p. 도로 폭 기반으로 바꾸면서 값의 폭이 0.45~0.95 로 넓어졌다.
   * 6%p 면 경로의 5분의 1 정도가 한 등급 위 도로로 바뀌는 크기다.
   */
  lit: 0.06,
} as const;

/** 니즈별 라벨 — 화면에 그대로 나간다 */
const NEED_LABELS: Record<RouteNeedId, string> = {
  clean: '공기가 가장 깨끗한 길',
  shade: '그늘이 가장 많은 길',
  quiet: '골목 위주로 가는 길',
  fast: '가장 빨리 가는 길',
  // 가로등 대장이 없어 추정값이다. "가로등이 많은 길"이라고 쓰면 세어 본 것처럼
  // 읽히므로, 상대 비교라는 게 드러나는 말을 쓴다.
  lit: '밤에 비교적 밝은 길',
};

/**
 * 라벨을 붙일 때의 우선순위.
 *
 * 한 경로가 여러 니즈에서 앞설 수 있다. 카드 제목은 하나뿐이라 그중
 * 무엇으로 부를지 정해야 하는데, 이 서비스가 존재하는 이유 순서로 둔다.
 * 공기 → 그늘 → 큰길 → 시간. 시간이 맨 뒤인 건 지도 앱이 이미 잘하는
 * 일이기 때문이다. 나머지 셋은 여기서만 알 수 있다.
 */
/**
 * 1등과 '사실상 비겼다'고 볼 상대 차이.
 *
 * 2% 는 79분 대 80분, 노출 52.0 대 53.0 수준이다. 이 안에 든 두 경로는
 * 어느 쪽을 골라도 결과가 같다고 말해도 된다.
 */
const TIE_TOLERANCE = 0.02;

const NEED_PRIORITY: RouteNeedId[] = ['clean', 'shade', 'quiet', 'fast'];

/**
 * 밤에는 순서가 달라진다.
 *
 * 해가 진 뒤에는 그늘이 아무 의미가 없고(막을 볕이 없다), 대신 어두운 길을
 * 혼자 걷는 문제가 앞으로 나온다. 조도를 맨 앞에 두고 그늘은 뺀다.
 */
const NEED_PRIORITY_NIGHT: RouteNeedId[] = ['lit', 'clean', 'quiet', 'fast'];

/**
 * 각 니즈에서 앞서는 후보를 찾는다.
 *
 * 승자는 "가장 좋은 값"이 아니라 "2등보다 문턱 이상 좋은 값"이다.
 * 1등과 2등이 붙어 있으면 그 니즈에서는 아무도 앞서지 않은 것으로 본다.
 */
function assignNeeds(
  candidates: Candidate[],
  night: boolean,
): Map<Candidate, RouteNeedId[]> {
  const result = new Map<Candidate, RouteNeedId[]>();
  for (const c of candidates) result.set(c, []);
  if (candidates.length < 2) return result;

  const claim = (
    need: RouteNeedId,
    valueOf: (c: Candidate) => number,
    /** 값이 클수록 좋은가 */
    higherIsBetter: boolean,
    /** 1등과 꼴찌의 차이가 이만큼은 나야 한다 */
    meaningful: (best: number, worst: number) => boolean,
  ) => {
    const sorted = [...candidates].sort((a, b) =>
      higherIsBetter ? valueOf(b) - valueOf(a) : valueOf(a) - valueOf(b),
    );
    const best = sorted[0];

    /*
     * 1등을 **꼴찌**와 견준다. 예전에는 2등과 견줬는데, 그게 라벨이 하나도
     * 안 붙던 진짜 원인이었다.
     *
     * 실측을 보면 후보 넷 중 둘은 거의 같은 길이 나온다(79분 vs 80분).
     * 2등과 견주면 그 1.3% 차이에 막혀 "가장 빨리 가는 길"이 사라지는데,
     * 정작 화면에는 148분짜리 후보가 함께 놓여 있다. 사용자가 보는 선택지의
     * 폭은 1등과 꼴찌의 차이지 1등과 2등의 차이가 아니다.
     *
     * 1·2등이 붙어 있는 건 문제가 아니다. 둘 중 아무거나 골라도 좋다는 뜻이고,
     * 그중 실제로 가장 나은 하나에 이름을 붙이는 건 거짓이 아니다.
     */
    if (!meaningful(valueOf(best), valueOf(sorted[sorted.length - 1]))) return;

    /*
     * 라벨을 한 경로가 독식하지 않게 편다.
     *
     * 실측에서 한 후보가 clean·quiet·fast 를 전부 가져가고 나머지 둘은
     * '추천 경로'로 남았다. 사실 관계로는 맞지만 화면으로는 최악이다 —
     * 고를 것이 셋인데 설명이 붙은 건 하나뿐이라, 나머지 둘이 왜 거기
     * 있는지 알 수 없다.
     *
     * 그래서 1등과 **사실상 비긴** 후보(TIE_TOLERANCE 안)가 있고 그쪽이 아직
     * 아무 라벨도 못 받았다면 그쪽에 준다. 비긴 값에 이름을 붙이는 것이므로
     * 거짓이 아니다 — "이 길도 그늘이 가장 많은 축"이 맞는 말이다.
     */
    const bestValue = valueOf(best);
    const tie = sorted.find((c) => {
      if (c === best) return false;
      if ((result.get(c)?.length ?? 0) > 0) return false;
      const gap = Math.abs(valueOf(c) - bestValue);
      const scale = Math.abs(bestValue) || 1;
      return gap / scale <= TIE_TOLERANCE;
    });

    const winner = (result.get(best)!.length > 0 && tie) ? tie : best;
    result.get(winner)!.push(need);
  };

  const relGap = (best: number, other: number) =>
    other === 0 ? 0 : (Math.abs(other - best) / Math.abs(other)) * 100;

  claim('clean', (c) => c.exposureScore, false, (b, r) => relGap(b, r) >= NEED_THRESHOLDS.clean);
  claim('quiet', (c) => c.roadWidthM, false, (b, w) => relGap(b, w) >= NEED_THRESHOLDS.quiet);
  claim('fast', (c) => c.durationSec, false, (b, r) => relGap(b, r) >= NEED_THRESHOLDS.fast);

  if (night) {
    // 밤에는 조도를 재고 그늘은 재지 않는다 — 막을 볕이 없다
    claim('lit', (c) => c.lighting, true, (b, r) => b - r >= NEED_THRESHOLDS.lit);
  } else {
    claim('shade', (c) => c.shadeFraction, true, (b, r) => b - r >= NEED_THRESHOLDS.shade);
  }

  return result;
}

/**
 * 우회가 지나친 후보를 걸러낸다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 * 실측에서 이런 결과가 나왔다.
 *   추천 경로       79분  6.2km  노출 52.0
 *   저위험 우회    148분 11.2km  노출 51.3   ← '공기가 가장 깨끗한 길'
 *
 * 노출을 1.3% 줄이려고 걷는 시간을 **거의 두 배**로 늘린 길이다. 게다가
 * 노출 점수는 시간 가중 평균이라, 두 배 오래 걸으면 실제로 들이마시는 총량은
 * 오히려 훨씬 많다. 평균만 낮을 뿐이다. 이런 걸 "가장 깨끗한 길"이라고
 * 이름 붙여 맨 위에 올리면 서비스가 사람을 해치는 조언을 하게 된다.
 *
 * ── 규칙 ────────────────────────────────────────────────
 * 기준 경로보다 시간이 TIME_CAP 배를 넘으면 버린다. 다만 노출이 크게
 * 좋아지는 경우(BIG_WIN 이상)에는 남긴다 — 미세먼지 '매우높음' 구간을
 * 통째로 피해 가는 길은 좀 돌아도 값어치가 있다.
 */
const DETOUR_TIME_CAP = 1.35;

/** 이만큼 좋아지면 시간 상한을 넘겨도 남긴다 (%) */
const DETOUR_BIG_WIN = 8;

function withinReason(candidates: Candidate[], baseline: Candidate): Candidate[] {
  const kept = candidates.filter((c) => {
    if (c === baseline) return true;
    if (baseline.durationSec <= 0) return true;

    const timeRatio = c.durationSec / baseline.durationSec;
    if (timeRatio <= DETOUR_TIME_CAP) return true;

    const gain =
      baseline.exposureScore > 0
        ? ((baseline.exposureScore - c.exposureScore) / baseline.exposureScore) * 100
        : 0;
    return gain >= DETOUR_BIG_WIN;
  });

  // 전부 걸러지는 일은 없어야 한다 — 최소한 기준 경로는 남는다
  return kept.length > 0 ? kept : [baseline];
}

function assemble(
  candidates: Candidate[],
  ctx: PlanContext,
  baseTime: string,
  engine: RouteEngine,
): RouteResult {
  const baseline = candidates.find((c) => c.isBaseline) ?? candidates[0];

  /*
   * 걸러내기가 먼저다.
   * 말도 안 되는 우회를 후보에 남겨 두면 니즈 판정의 '꼴찌'가 되어, 나머지
   * 후보들의 차이를 실제보다 크게 보이게 만든다.
   */
  const viable = withinReason(candidates, baseline);

  /*
   * 라벨 붙이기.
   *
   * ── 왜 바꿨나 ───────────────────────────────────────
   * 예전에는 '가장 안전한 길 / 균형 / 추천 경로' 였다. 노출 점수 하나로 줄을
   * 세운 이름들인데, 실제로 돌려 보면 후보들의 노출 점수가 1~3점 안에 몰린다.
   * 화면에는 순위가 보이지만 사람에게는 고를 근거가 없고, '균형'이라는 이름은
   * 무엇과 무엇의 균형인지 말해 주지 않는다.
   *
   * 이제는 **사람이 실제로 원하는 것**으로 부른다. 여름 한낮에는 그늘이,
   * 유모차를 밀 때는 큰길을 피하는 게, 늦었을 때는 시간이 결정을 좌우한다.
   * 이 값들은 이미 다 계산하고 있었는데 화면에 꺼내지 않았을 뿐이다.
   *
   * 라벨은 생성 방식이 아니라 측정 결과로 붙는다 — '그늘 우선으로 만든 경로'가
   * 아니라 '재 보니 그늘이 가장 많은 경로'다. 아무 니즈에서도 앞서지 못한
   * 후보는 '추천 경로'로만 남는다.
   */
  const needs = assignNeeds(viable, ctx.night);
  const priority = ctx.night ? NEED_PRIORITY_NIGHT : NEED_PRIORITY;

  const labelled = viable.map((candidate) => {
    const own = needs.get(candidate) ?? [];
    const primary = priority.find((n) => own.includes(n));

    const kind: RouteKind = own.includes('clean')
      ? 'safest'
      : candidate === baseline
        ? 'fastest'
        : 'balanced';

    return {
      candidate,
      kind,
      bestFor: own,
      // 앞서는 게 없으면 기준 경로든 아니든 '추천 경로'다.
      // 내비게이션 앱이 기본으로 주는 그 길이라는 뜻이다.
      label: primary ? NEED_LABELS[primary] : '추천 경로',
    };
  });

  /*
   * 차례.
   *
   * 니즈를 많이 만족시키는 순 → 그다음은 우선순위가 앞선 니즈 순.
   * 아무것도 앞서지 못한 경로(추천 경로)는 항상 맨 뒤로 간다. 비교 기준선이라
   * 사라지면 안 되지만, 먼저 읽힐 이유도 없다.
   */
  const rank = (bestFor: RouteNeedId[]) => {
    if (bestFor.length === 0) return 99;
    return Math.min(...bestFor.map((n) => priority.indexOf(n)));
  };
  labelled.sort(
    (a, b) =>
      rank(a.bestFor) - rank(b.bestFor) || b.bestFor.length - a.bestFor.length,
  );

  const options: RouteOption[] = labelled.map(({ candidate, kind, label, bestFor }, i) => {
    const deltaPct =
      baseline.exposureScore > 0
        ? round1(
            ((candidate.exposureScore - baseline.exposureScore) /
              baseline.exposureScore) *
              100,
          )
        : 0;

    return {
      // 같은 kind가 둘 이상일 수 있어 인덱스를 붙여 고유하게 만든다
      id: `${kind}-${i}`,
      kind,
      label,
      bestFor,
      traits: {
        shadeFraction: candidate.shadeFraction,
        roadFactor: candidate.roadFactor,
        roadWidthM: candidate.roadWidthM,
        lighting: candidate.lighting,
        night: ctx.night,
      },
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
      guides: candidate.guides,
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

/**
 * TMAP 안내를 화면용 타입으로.
 *
 * 좌표 표기만 바꾼다 — TMAP 계층은 {lat,lng}, 화면 계층은 [위도, 경도]를 쓴다.
 */
function toRouteGuides(guides: TmapGuide[]): RouteGuide[] {
  return guides.map((g) => ({
    description: g.description,
    turnType: g.turnType,
    roadName: g.roadName,
    landmark: g.landmark,
    distanceM: g.distanceM,
    durationSec: g.durationSec,
    continuation: g.continuation,
    coord: [g.coord.lat, g.coord.lng] as [number, number],
  }));
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
