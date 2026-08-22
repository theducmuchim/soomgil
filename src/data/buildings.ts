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
 * ── 데이터 ──────────────────────────────────────────────
 * 국토교통부 GIS건물통합정보(대전분, 2026-08-09 기준) 175,270동에서 만들었다.
 * 연속지적도 건물 공간정보에 건축물대장 속성을 결합한 자료라, 대전에 실제로
 * 서 있는 건물이 사실상 전부 들어 있다.
 *
 * 그중 높이를 알 수 있는 120,767동을 썼다. 나머지 54,073동은 건축물대장에
 * 높이도 지상층수도 비어 있어(무허가·미등기 등) 뺐다.
 *
 * ── 격자 채움률을 어떻게 읽어야 하나 ────────────────────
 * 격자 39,984칸 중 값이 있는 칸은 7,875칸(19.7%)이다. 낮아 보이지만 이 격자는
 * 대전을 감싸는 사각형이고, 그 안의 대부분은 산·농지·하천이라 건물이 없다.
 * 계족산·보문산 좌표를 찍으면 "데이터 없음"이 나오는 게 맞다.
 *
 * 의미 있는 숫자는 **실제 경로가 지나는 지점 중 몇 %에서 값이 나오는가**이고,
 * 그건 scripts/verify-road.ts 가 알려준다.
 *
 * ── 값이 없으면 보정하지 않는다 ─────────────────────────
 * 건물 데이터가 없는 칸에 평균값을 넣어 보정하면, 실제로 확인한 것과 추측한
 * 것이 화면에서 구분되지 않는다. 이 서비스에서 그건 하면 안 되는 일이다.
 *
 * ── 데이터를 갱신하려면 ─────────────────────────────────
 * 새 배포본을 받아 scripts/build-canyon-grid.ts 를 돌리면 이 파일이 참조하는
 * JSON 이 교체된다. 나머지 코드는 손대지 않아도 된다. 절차는 README 참고.
 */

/** 이 격자가 실제 건축물대장 기반인지, 잠정 데이터인지 */
export const CANYON_SOURCE: 'osm-partial' | 'molit-building' = 'molit-building';

interface CanyonGrid {
  minLat: number;
  minLng: number;
  dLat: number;
  dLng: number;
  rows: number;
  cols: number;
  cellM: number;
  /** [셀 index, 평균높이(m), 건물 수, 바닥면적합(m²)] 을 4개씩 이어붙인 배열 */
  cells: number[];
}

const grid = GRID as CanyonGrid;

/** 셀 index → [평균높이, 건물 수, 바닥면적합] */
let lookup: Map<number, [number, number, number]> | null = null;

function getLookup(): Map<number, [number, number, number]> {
  if (lookup) return lookup;
  lookup = new Map();
  for (let i = 0; i < grid.cells.length; i += 4) {
    lookup.set(grid.cells[i], [
      grid.cells[i + 1],
      grid.cells[i + 2],
      grid.cells[i + 3],
    ]);
  }
  return lookup;
}

/** 격자 한 칸의 넓이 (m²) */
const CELL_AREA_M2 = grid.cellM * grid.cellM;

export interface CanyonSample {
  /** 주변 건물의 바닥면적 가중 평균 높이 (m) */
  meanHeightM: number;
  /** 이 값을 만든 건물 수 — 적을수록 근거가 약하다 */
  buildings: number;
  /** 건폐율 0~1 — 격자 넓이 중 건물이 덮은 비율 */
  builtRatio: number;
  /** 건물 한 동의 평균 바닥 한 변 길이 (m). 그림자 길이 환산에 쓴다 */
  meanFootprintM: number;
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

  const [meanHeightM, buildings, footprintM2] = hit;

  return {
    meanHeightM,
    buildings,
    builtRatio: Math.min(footprintM2 / CELL_AREA_M2, 1),
    // 건물 한 동을 정사각형으로 보고 한 변의 길이를 잡는다 — 그림자 길이와
    // 견주어 "그림자가 옆 건물까지 닿는가"를 가늠하는 데 쓴다
    meanFootprintM: Math.sqrt(Math.max(footprintM2 / buildings, 1)),
  };
}

/** 격자에 값이 있는 셀 비율 — /guide 에 커버리지를 밝히는 데 쓴다 */
export function canyonCoverage(): { cells: number; total: number; pct: number } {
  const cells = grid.cells.length / 4;
  const total = grid.rows * grid.cols;
  return { cells, total, pct: Math.round((cells / total) * 1000) / 10 };
}
