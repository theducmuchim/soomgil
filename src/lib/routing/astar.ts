import { distanceM, type Grid, type GridNode } from './grid';

export interface PathCostOptions {
  /**
   * 위험 가중치.
   * 0이면 위험을 무시하고, 클수록 위험한 지역을 크게 우회한다.
   */
  riskWeight: number;
  /**
   * 직선 선호도.
   *
   * ⚠ 이 항이 없으면 세 경로안이 전부 같은 길이로 나온다.
   *
   * 8방향 격자에서 출발점→도착점 사이의 "계단형" 경로들은 기하학적으로 **길이가 전부 같다**.
   * (대각선 이동이 가로+세로 두 칸을 한 번에 덮기 때문)
   * 그래서 위험 가중치만 바꾸면 A*는 같은 길이의 경로 집합 안에서만 골라서,
   * 거리는 그대로인데 노출만 줄어드는 결과가 나온다.
   * 시간과 노출 사이의 실제 맞바꿈이 표현되지 않는다.
   *
   * 실제 도시에는 목적지 방향으로 곧게 뻗은 간선도로가 있고 빠른 길은 그 위를 달린다.
   * 출발-도착 직선에서 멀어질수록 비용을 더해 이 성질을 흉내 낸다.
   * 결과적으로 최단 경로는 직선에 붙고, 안전 경로는 우회를 허용해 실제로 더 길어진다.
   */
  straightWeight: number;
}

/**
 * A* 경로 탐색.
 *
 *   비용 = 거리 × (1 + riskWeight × 위험도/100 + straightWeight × 직선이탈거리/1km)
 *
 * 휴리스틱은 남은 직선거리다. 실제 비용의 배율이 항상 1 이상이므로
 * 휴리스틱이 실제 비용을 넘지 않아(admissible) 최적해가 보장된다.
 */
export function findPath(
  grid: Grid,
  startIndex: number,
  goalIndex: number,
  risk: Float32Array,
  options: PathCostOptions,
): GridNode[] {
  const { nodes, walkable } = grid;
  const start = nodes[startIndex];
  const goal = nodes[goalIndex];
  const { riskWeight, straightWeight } = options;

  const gScore = new Float64Array(nodes.length).fill(Infinity);
  const cameFrom = new Int32Array(nodes.length).fill(-1);
  const closed = new Uint8Array(nodes.length);

  gScore[startIndex] = 0;

  const open = new MinHeap();
  open.push(startIndex, distanceM(start, goal));

  while (open.size > 0) {
    const current = open.pop();
    if (current === goalIndex) return reconstruct(nodes, cameFrom, current);
    if (closed[current]) continue;
    closed[current] = 1;

    const node = nodes[current];

    for (const neighbor of neighborsOf(node, grid)) {
      if (closed[neighbor.index] || !walkable.has(neighbor.index)) continue;

      const d = distanceM(node, neighbor);
      const offLine =
        straightWeight === 0 ? 0 : perpendicularDistanceM(neighbor, start, goal);

      // 진입하는 노드의 상태로 비용을 매긴다
      const penalty =
        1 + riskWeight * (risk[neighbor.index] / 100) + straightWeight * (offLine / 1000);
      const tentative = gScore[current] + d * penalty;

      if (tentative < gScore[neighbor.index]) {
        cameFrom[neighbor.index] = current;
        gScore[neighbor.index] = tentative;
        open.push(neighbor.index, tentative + distanceM(neighbor, goal));
      }
    }
  }

  return [];
}

/** 점에서 출발-도착 직선까지의 수직거리 (m) */
function perpendicularDistanceM(
  point: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const latToM = 111_320;
  const lngToM = 111_320 * Math.cos((36.35 * Math.PI) / 180);

  const px = (point.lng - a.lng) * lngToM;
  const py = (point.lat - a.lat) * latToM;
  const bx = (b.lng - a.lng) * lngToM;
  const by = (b.lat - a.lat) * latToM;

  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);

  // 선분 밖으로 나가는 경우도 선분 위로 잘라서 잰다
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 8방향 이웃 */
function neighborsOf(node: GridNode, grid: Grid): GridNode[] {
  const out: GridNode[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = node.row + dr;
      const c = node.col + dc;
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;
      out.push(grid.nodes[r * grid.cols + c]);
    }
  }
  return out;
}

function reconstruct(nodes: GridNode[], cameFrom: Int32Array, end: number): GridNode[] {
  const path: GridNode[] = [];
  let current = end;
  while (current !== -1) {
    path.push(nodes[current]);
    current = cameFrom[current];
  }
  return path.reverse();
}

/** 이진 힙 — 노드가 3천 개라 매번 정렬하면 느리다 */
class MinHeap {
  private items: { index: number; priority: number }[] = [];

  get size() {
    return this.items.length;
  }

  push(index: number, priority: number) {
    this.items.push({ index, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (
          left < this.items.length &&
          this.items[left].priority < this.items[smallest].priority
        ) {
          smallest = left;
        }
        if (
          right < this.items.length &&
          this.items[right].priority < this.items[smallest].priority
        ) {
          smallest = right;
        }
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.index;
  }
}
