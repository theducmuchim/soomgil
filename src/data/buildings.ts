import GRID from './geo/canyon-grid.json';

/**
 * 대전 건물 높이 격자 — street canyon 종횡비 계산용.
 *
 * ── 왜 격자인가 ─────────────────────────────────────────
 * 건물 폴리곤을 그대로 들고 다니면 대전만 20만 동이 넘는다. 경로 한 건에
 * 수천 개 좌표를 판정해야 하는데 폴리곤을 매번 훑을 수는 없다.
 *
 * 우리가 필요한 건 "이 지점 주변 건물이 대체로 얼마나 높은가" 하나뿐이라,
 * 150m 격자마다 **바닥면적 가중 평균 높이**를 미리 구해 둔다. 바닥면적으로
 * 가중하는 이유는 캐니언 벽을 만드는 게 큰 건물이기 때문이다 — 20층 아파트
 * 한 동과 그 옆 단층 상가 열 채의 평균을 단순히 내면 실제 벽 높이보다 낮아진다.
 *
 * ── 지금 데이터의 한계 ──────────────────────────────────
 * 지금 실려 있는 값은 **OpenStreetMap 에서 높이·층수 태그가 달린 대전 건물
 * 1,993동**으로 만든 잠정 데이터다. 대전 전체 건물의 1% 남짓이라
 * 격자의 1.4%에만 값이 있다.
 *
 * 값이 없는 격자에는 **보정을 걸지 않는다**(계수 1.0). 건물 데이터가 없는 곳에
 * 평균값을 넣어 보정하면, 실제로 확인한 것과 추측한 것이 화면에서 구분되지
 * 않는다. 이 서비스에서 그건 하면 안 되는 종류의 일이다.
 *
 * ── 실제 데이터로 바꾸기 ────────────────────────────────
 * 국토교통부 GIS건물통합정보(대전분)를 받아 scripts/build-canyon-grid.ts 를
 * 돌리면 이 파일이 그대로 교체된다. 절차는 README 참고.
 * 그때 격자 채움률이 1.4% → 거의 100% 가 되고, 이 파일의 다른 코드는
 * 손대지 않아도 된다.
 */

/** 이 격자가 실제 건축물대장 기반인지, 잠정 데이터인지 */
export const CANYON_SOURCE: 'osm-partial' | 'molit-building' = 'osm-partial';

interface CanyonGrid {
  minLat: number;
  minLng: number;
  dLat: number;
  dLng: number;
  rows: number;
  cols: number;
  cellM: number;
  /** [셀 index, 평균높이(m), 건물 수] 를 3개씩 이어붙인 배열 */
  cells: number[];
}

const grid = GRID as CanyonGrid;

/** 셀 index → [평균높이, 건물 수] */
let lookup: Map<number, [number, number]> | null = null;

function getLookup(): Map<number, [number, number]> {
  if (lookup) return lookup;
  lookup = new Map();
  for (let i = 0; i < grid.cells.length; i += 3) {
    lookup.set(grid.cells[i], [grid.cells[i + 1], grid.cells[i + 2]]);
  }
  return lookup;
}

export interface CanyonSample {
  /** 주변 건물의 바닥면적 가중 평균 높이 (m) */
  meanHeightM: number;
  /** 이 값을 만든 건물 수 — 적을수록 근거가 약하다 */
  buildings: number;
}

/**
 * 이 좌표가 속한 격자의 건물 높이. 데이터가 없으면 null.
 *
 * ── 왜 자기 칸만 보는가 ─────────────────────────────────
 * 처음에는 인접 8칸까지 훑었다. 도로는 건물 사이를 지나가니 도로 좌표가 찍힌
 * 칸 자체는 비어 있을 수 있다는 이유였는데, 실제로 돌려 보니 값이 있는 칸
 * 하나가 450m×450m 를 물들여서 캐니언이 아닌 구간까지 캐니언으로 잡혔다.
 *
 * 150m 격자면 도로 양옆 건물은 대개 같은 칸에 들어온다. 놓치는 경우보다
 * 없는 캐니언을 만들어내는 쪽이 이 서비스에서는 더 나쁘다.
 */
export function canyonAt(lat: number, lng: number): CanyonSample | null {
  const row = Math.floor((lat - grid.minLat) / grid.dLat);
  const col = Math.floor((lng - grid.minLng) / grid.dLng);
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return null;

  const hit = getLookup().get(row * grid.cols + col);
  if (!hit) return null;

  return { meanHeightM: hit[0], buildings: hit[1] };
}

/** 격자에 값이 있는 셀 비율 — /guide 에 커버리지를 밝히는 데 쓴다 */
export function canyonCoverage(): { cells: number; total: number; pct: number } {
  const cells = grid.cells.length / 3;
  const total = grid.rows * grid.cols;
  return { cells, total, pct: Math.round((cells / total) * 1000) / 10 };
}
