import type { AreaRisk, IndicatorId, WindReading } from '@/types';
import { getGrid, type Grid } from '@/lib/routing/grid';
import { corridorFactor } from '@/lib/risk/corridors';
import { treeProximityFactor } from '@/lib/risk/tree-proximity';

/**
 * 경로 위험도 보정 체인.
 *
 *   지역 종합 점수
 *     → ① 가로수 근접 보정 (소나무·참나무 꽃가루 몫에만, 봄철)
 *     → ② 하천축 보정 (갑천·유등천·대전천 주변은 확산이 좋아 감소)
 *     → ③ 풍향 보정 (바람 불어오는 쪽이 더 나쁘면 가산)
 *
 * ①은 발생원과의 거리, ②는 확산 조건, ③은 이동해 오는 오염물질을 본다.
 * 서로 다른 원리라 곱하는 대상도 다르다 — ①은 꽃가루 몫에만, ②③은 전체에 건다.
 *
 * ── 아래는 ③ 풍향 보정 ──────────────────────────────────
 *
 * 같은 지역이어도 "바람이 어디에서 불어오는가"에 따라 실제 노출량이 다르다.
 * 고농도 지역의 풍하측(바람이 흘러가는 쪽)은 자기 지역 농도보다 나쁠 수 있고,
 * 풍상측은 반대다. 기존 서비스가 지역 단위 값만 주고 끝내는 지점이 여기다.
 *
 * 모델
 *   각 격자 노드에서 바람이 불어오는 쪽으로 UPWIND_DISTANCE_M 만큼 떨어진 지점을 본다.
 *   그 지점의 위험도가 지금 위치보다 높으면, 차이의 일부를 가산한다.
 *
 *     effective = base + max(0, upwind - base) × WIND_TRANSPORT_RATIO × 풍속계수
 *
 *   풍속이 셀수록 상류의 공기가 더 많이 실려오므로 계수가 커진다.
 *   다만 아주 강한 바람은 오히려 희석시키므로 상한을 둔다.
 */

/** 상류를 몇 m 떨어진 지점에서 볼 것인가 */
const UPWIND_DISTANCE_M = 2200;

/** 상류와의 위험도 차이를 얼마나 물려받는가 */
const WIND_TRANSPORT_RATIO = 0.45;

/** 풍속 계수가 최대가 되는 풍속 (m/s) */
const WIND_SPEED_SATURATION = 5;

export interface NodeRiskMap {
  /** 노드 index → 지역 자체 위험도 */
  base: Float32Array;
  /** 노드 index → 풍향 보정 후 위험도 */
  effective: Float32Array;
}

/**
 * 격자 노드마다 위험도를 매긴다.
 *
 * @param areaRisks 행정동 단위 위험도
 * @param wind      대전 전역 대표 바람 (자치구별 차이가 크지 않아 하나로 쓴다)
 */
/** 소나무·참나무 꽃가루 — 가로수 근접 보정을 받는 지표 */
const TREE_POLLEN: IndicatorId[] = ['pinePollen', 'oakPollen'];

export function buildNodeRiskMap(areaRisks: AreaRisk[], wind: WindReading): NodeRiskMap {
  const grid = getGrid();
  const riskByArea = new Map(areaRisks.map((a) => [a.areaId, a.score]));

  /*
   * 지역별 종합 점수 중 소나무·참나무 꽃가루가 차지하는 몫.
   *
   * 가로수 보정은 이 몫에만 걸어야 한다. 종합 점수 전체에 곱하면
   * 미세먼지·오존까지 가로수 옆에서 올라가 버리는데, 대기 중 오염물질 농도는
   * 가로수 위치와 무관하다. contributions 에 이미 지표별 기여 점수가
   * 계산돼 있으므로 그대로 떼어내 쓴다.
   *
   * 봄이 아니면(꽃가루가 이번 계절 가중치에 없으면) 이 값이 0이라
   * 보정 자체가 걸리지 않는다. 가을 잡초류에도 걸리지 않는다.
   */
  const treePollenPoints = new Map<string, number>();
  for (const area of areaRisks) {
    const points = area.breakdown.contributions
      .filter((c) => TREE_POLLEN.includes(c.id))
      .reduce((sum, c) => sum + c.points, 0);
    treePollenPoints.set(area.areaId, points);
  }

  const base = new Float32Array(grid.nodes.length);
  for (const node of grid.nodes) {
    const areaScore = node.dongId ? (riskByArea.get(node.dongId) ?? 0) : 0;
    if (areaScore === 0) {
      base[node.index] = 0;
      continue;
    }

    /*
     * 가로수 근접 보정 — 꽃가루 몫에만.
     * 참나무 가로수길을 따라 걷는 구간은 같은 동이어도 꽃가루 노출이 크고,
     * 가로수가 전혀 없는 이면도로는 작다.
     */
    const pollenPart = node.dongId ? (treePollenPoints.get(node.dongId) ?? 0) : 0;
    const adjusted =
      pollenPart > 0
        ? areaScore - pollenPart + pollenPart * treeProximityFactor(node.lat, node.lng)
        : areaScore;

    // 하천변은 좌우가 트여 확산이 좋고 차도에서 떨어져 있어 같은 동 안에서도 낮다.
    // 행정동 단위 값만으로는 표현되지 않는 차이라 격자 단계에서 입힌다.
    base[node.index] = Math.min(adjusted * corridorFactor(node.lat, node.lng), 100);
  }

  // 풍속 계수 0~1
  const speedFactor = Math.min(wind.speed / WIND_SPEED_SATURATION, 1);

  // 바람이 "불어오는" 방향으로의 변위 (풍향 0도 = 북쪽에서 불어옴 → 상류는 북쪽)
  const rad = (wind.degree * Math.PI) / 180;
  const dLat = (Math.cos(rad) * UPWIND_DISTANCE_M) / 111_320;
  const dLng =
    (Math.sin(rad) * UPWIND_DISTANCE_M) /
    (111_320 * Math.cos((36.35 * Math.PI) / 180));

  const effective = new Float32Array(grid.nodes.length);
  for (const node of grid.nodes) {
    const self = base[node.index];
    if (self === 0) {
      effective[node.index] = 0;
      continue;
    }

    const upwind = sampleAt(grid, base, node.lat + dLat, node.lng + dLng);
    const inflow = Math.max(0, upwind - self);

    effective[node.index] = Math.min(
      100,
      self + inflow * WIND_TRANSPORT_RATIO * speedFactor,
    );
  }

  return { base, effective };
}

/** 임의 좌표의 위험도 — 가장 가까운 격자 노드 값을 쓴다 */
function sampleAt(grid: Grid, values: Float32Array, lat: number, lng: number): number {
  const row = Math.round(
    ((lat - grid.minLat) / (grid.maxLat - grid.minLat)) * (grid.rows - 1),
  );
  const col = Math.round(
    ((lng - grid.minLng) / (grid.maxLng - grid.minLng)) * (grid.cols - 1),
  );

  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return 0;
  return values[row * grid.cols + col];
}

/**
 * 임의 좌표에서 실효 위험도를 읽는 함수를 만든다.
 *
 * 격자 경로는 노드마다 index가 있어 배열을 바로 참조하면 되지만,
 * TMAP이 주는 실제 도로 좌표는 격자 위에 있지 않다.
 * 가장 가까운 격자 노드 값을 쓴다 — 격자 간격이 약 550m이고
 * 위험도는 행정동 단위로 매끄럽게 변하는 값이라 이 해상도로 충분하다.
 *
 * 반환되는 값에는 풍향 보정과 하천축 보정이 이미 반영돼 있다.
 * 그래서 경로가 격자에서 왔든 TMAP에서 왔든 **같은 위험도 모델**을 통과한다.
 */
export function createRiskSampler(
  riskMap: NodeRiskMap,
): (lat: number, lng: number) => number {
  const grid = getGrid();
  return (lat, lng) => sampleAt(grid, riskMap.effective, lat, lng);
}
