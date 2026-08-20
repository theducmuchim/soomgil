import type {
  AreaRisk,
  RiskSnapshot,
  RouteKind,
  RouteOption,
  RouteResult,
  RouteSegment,
} from '@/types';
import type { Place } from '@/data/places';
import { DONG_GEOJSON } from '@/data/geo/dong';
import { levelFromScore } from '@/lib/risk/score';
import { buildNodeRiskMap, exposureScore } from '@/lib/risk/route-score';
import { findPath } from './astar';
import { distanceM, getGrid, nearestNode, type GridNode } from './grid';

/**
 * 경로 계획.
 *
 * TODO(live): 실제 도로망이 필요해지면 이 파일의 findPath 호출부만
 *             TMAP 보행자/자동차 경로 API로 갈아끼우면 된다.
 *             노출량 계산(route-score.ts)은 경로 좌표만 있으면 그대로 동작한다.
 */

export type TravelMode = 'walk' | 'bike' | 'car';

export const TRAVEL_MODES: Record<
  TravelMode,
  { label: string; speedMs: number; note: string }
> = {
  walk: { label: '도보', speedMs: 1.25, note: '시속 4.5km' },
  bike: { label: '자전거', speedMs: 4.2, note: '시속 15km' },
  car: { label: '자동차', speedMs: 8.3, note: '도심 평균 시속 30km' },
};

/**
 * 세 가지 경로안.
 *
 * riskWeight     : 위험 지역을 얼마나 피하는가
 * straightWeight : 출발-도착 직선에 얼마나 붙는가 (간선도로 근사)
 */
const PLANS: {
  kind: RouteKind;
  label: string;
  riskWeight: number;
  straightWeight: number;
  blurb: string;
}[] = [
  {
    kind: 'safest',
    label: '가장 안전한 길',
    riskWeight: 9,
    straightWeight: 0,
    blurb: '위험한 지역을 크게 우회합니다',
  },
  {
    kind: 'balanced',
    label: '균형',
    riskWeight: 2.5,
    straightWeight: 0.55,
    blurb: '시간과 노출량을 함께 고려합니다',
  },
  {
    kind: 'fastest',
    label: '최단 시간',
    riskWeight: 0,
    straightWeight: 2.2,
    blurb: '간선도로를 따라 가장 빠른 길로 갑니다',
  },
];

/**
 * 직선 이탈에 따른 속도 저하.
 *
 * 격자 위 경로는 8방향 이동이라 출발점과 도착점이 같으면
 * 계단 모양이 달라도 **거리가 기하학적으로 똑같다**.
 * 그래서 거리만으로는 "시간을 더 써서 노출을 줄인다"는 맞바꿈을 표현할 수 없다.
 *
 * 대신 실제로 참인 성질을 쓴다.
 * 목적지 방향으로 곧게 뻗은 간선도로는 신호·교차로가 적어 평균 속도가 빠르고,
 * 우회로는 좁은 이면도로와 생활도로를 지나 느리다.
 * 직선에서 평균 몇 km 벗어났는지로 평균 속도를 깎는다.
 *
 *   실효속도 = 기본속도 ÷ (1 + DEVIATION_SLOWDOWN × 평균이탈거리km)
 *
 * 이 값이 0이면 세 경로의 소요시간이 전부 같게 나온다.
 */
const DEVIATION_SLOWDOWN = 0.34;

export function planRoutes({
  origin,
  destination,
  snapshot,
  dongRisks,
  mode = 'walk',
}: {
  origin: Place;
  destination: Place;
  snapshot: RiskSnapshot;
  dongRisks: AreaRisk[];
  mode?: TravelMode;
}): RouteResult {
  const grid = getGrid();
  const baseSpeed = TRAVEL_MODES[mode].speedMs;

  // 바람은 출발지 자치구 값을 대표로 쓴다.
  // 대전 안에서 풍향은 구별로 크게 다르지 않고, 격자마다 다른 바람을 쓰면
  // 보정 결과가 들쭉날쭉해져 오히려 읽기 어려워진다.
  const wind =
    snapshot.districts.find((d) => d.areaId === origin.districtId)?.wind ??
    snapshot.districts[0].wind;

  const { effective } = buildNodeRiskMap(dongRisks, wind);

  const start = nearestNode(grid, origin.coord[0], origin.coord[1]);
  const goal = nearestNode(grid, destination.coord[0], destination.coord[1]);

  const riskById = new Map(dongRisks.map((r) => [r.areaId, r]));
  const dongNameById = new Map(
    DONG_GEOJSON.features.map((f) => [f.properties.id, f.properties.name]),
  );

  const seen = new Set<string>();
  const raw: {
    plan: (typeof PLANS)[number];
    path: GridNode[];
    speed: number;
  }[] = [];

  /*
   * 중복 제거는 최단 경로부터 본다.
   *
   * 최단 경로는 "이 길로 가면 노출이 몇 % 줄어드는가"의 기준선이다.
   * 안전 경로부터 훑으면, 안전 경로와 최단 경로가 같은 길로 나올 때
   * 최단 경로 쪽이 지워져서 화면에 없는 경로를 기준으로 비율을 계산하게 된다.
   * 기준선은 항상 남기고, 그와 같은 길로 나온 다른 안을 지운다.
   */
  const searchOrder = [...PLANS].reverse();

  for (const plan of searchOrder) {
    const path = findPath(grid, start.index, goal.index, effective, {
      riskWeight: plan.riskWeight,
      straightWeight: plan.straightWeight,
    });
    if (path.length < 2) continue;

    // 서로 다른 가중치가 같은 경로를 내놓는 일이 흔하다.
    // 같은 카드를 두 장 보여주면 계산이 안 된 것처럼 보이므로 하나만 남긴다.
    const signature = path.map((n) => n.index).join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);

    const deviationKm = averageDeviationKm(path, start, goal);
    raw.push({
      plan,
      path,
      speed: baseSpeed / (1 + DEVIATION_SLOWDOWN * deviationKm),
    });
  }

  // 기준선은 최단 경로 — "이 길로 가면 노출이 몇 % 줄어드는가"의 분모.
  // 최단 경로가 중복 제거로 빠졌다면 가장 빠른 것을 기준으로 삼는다.
  const stats = raw.map((r) => ({
    ...r,
    stat: exposureScore(r.path, effective, r.speed),
  }));

  const baseline =
    stats.find((s) => s.plan.kind === 'fastest')?.stat ??
    [...stats].sort((a, b) => a.stat.durationSec - b.stat.durationSec)[0]?.stat;

  // 화면에는 안전한 순으로 보여준다 (탐색 순서와 표시 순서는 별개)
  const displayOrder = PLANS.map((p) => p.kind);
  stats.sort(
    (a, b) => displayOrder.indexOf(a.plan.kind) - displayOrder.indexOf(b.plan.kind),
  );

  const options: RouteOption[] = stats.map(({ plan, path, speed, stat }) => {
    const segments = buildSegments(path, effective, speed, riskById, dongNameById);
    const deltaPct =
      baseline && baseline.score > 0
        ? round1(((stat.score - baseline.score) / baseline.score) * 100)
        : 0;

    return {
      id: plan.kind,
      kind: plan.kind,
      label: plan.label,
      segments,
      distanceM: stat.distanceM,
      durationSec: stat.durationSec,
      exposureScore: stat.score,
      level: levelFromScore(stat.score),
      exposureDeltaPct: deltaPct,
    };
  });

  return {
    origin: { name: origin.name, coord: origin.coord },
    destination: { name: destination.name, coord: destination.coord },
    options,
    baseTime: snapshot.baseTime,
  };
}

/** 경로가 출발-도착 직선에서 평균 몇 km 벗어나는가 */
function averageDeviationKm(
  path: GridNode[],
  start: GridNode,
  goal: GridNode,
): number {
  const latToM = 111_320;
  const lngToM = 111_320 * Math.cos((36.35 * Math.PI) / 180);

  const bx = (goal.lng - start.lng) * lngToM;
  const by = (goal.lat - start.lat) * latToM;
  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return 0;

  let total = 0;
  for (const node of path) {
    const px = (node.lng - start.lng) * lngToM;
    const py = (node.lat - start.lat) * latToM;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
    const dx = px - t * bx;
    const dy = py - t * by;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / path.length / 1000;
}

/**
 * 격자 경로를 행정동 단위 구간으로 묶는다.
 *
 * 노드 하나하나를 그대로 보여주면 읽을 수 없다.
 * "어느 동을 몇 분간 지나가는가"로 묶어야 사용자가 판단할 수 있다.
 *
 * 아주 짧게 스쳐 지나가는 동(모서리만 잘라 지나가는 경우)은 앞 구간에 합친다.
 * 그대로 두면 "0분" 구간이 목록의 절반을 차지해 정작 중요한 구간이 묻힌다.
 */
const MIN_SEGMENT_M = 400;

function buildSegments(
  path: GridNode[],
  effective: Float32Array,
  speedMs: number,
  riskById: Map<string, AreaRisk>,
  dongNameById: Map<string, string>,
): RouteSegment[] {
  const rawSegments: RouteSegment[] = [];
  // 구간 위험도는 시작 노드 하나가 아니라 그 구간이 지나는 노드 전체의 평균으로 낸다.
  // 하천변을 따라가는 구간은 같은 동이어도 실제로 더 낮게 나와야 한다.
  const segmentNodeRisks: number[][] = [];
  let current: RouteSegment | null = null;

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const areaId = node.dongId ?? 'unknown';

    if (!current || current.areaId !== areaId) {
      if (current) rawSegments.push(current);
      segmentNodeRisks.push([effective[node.index]]);
      current = {
        areaId,
        areaName: dongNameById.get(areaId) ?? '대전 외곽',
        path: [[node.lat, node.lng]],
        distanceM: 0,
        durationSec: 0,
        areaScore: riskById.get(areaId)?.score ?? 0,
        effectiveScore: round1(effective[node.index]),
      };
      // 구간이 바뀌어도 선이 끊기지 않도록 이전 노드를 시작점으로 잇는다
      if (i > 0) {
        const prev = path[i - 1];
        current.path.unshift([prev.lat, prev.lng]);
        const d = distanceM(prev, node);
        current.distanceM += d;
        current.durationSec += d / speedMs;
      }
      continue;
    }

    const prev = path[i - 1];
    const d = distanceM(prev, node);
    current.path.push([node.lat, node.lng]);
    current.distanceM += d;
    current.durationSec += d / speedMs;
    segmentNodeRisks[segmentNodeRisks.length - 1].push(effective[node.index]);
  }
  if (current) rawSegments.push(current);

  for (let i = 0; i < rawSegments.length; i++) {
    const values = segmentNodeRisks[i] ?? [];
    if (values.length > 0) {
      rawSegments[i].effectiveScore = round1(
        values.reduce((sum, v) => sum + v, 0) / values.length,
      );
    }
  }

  // 짧은 구간 합치기
  const merged: RouteSegment[] = [];
  for (const segment of rawSegments) {
    const prev = merged[merged.length - 1];
    if (prev && segment.distanceM < MIN_SEGMENT_M) {
      prev.path = [...prev.path, ...segment.path];
      prev.distanceM += segment.distanceM;
      prev.durationSec += segment.durationSec;
      // 합쳐진 구간의 위험도는 더 나쁜 쪽을 남긴다 — 경고를 희석하지 않기 위해
      prev.effectiveScore = Math.max(prev.effectiveScore, segment.effectiveScore);
      continue;
    }
    merged.push({ ...segment });
  }

  return merged.map((s) => ({
    ...s,
    distanceM: Math.round(s.distanceM),
    durationSec: Math.round(s.durationSec),
  }));
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}
