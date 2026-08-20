/**
 * 하천축 보정.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────
 * 행정동 단위 위험도는 도심에서 외곽으로 매끄럽게 변한다. 그런데 그 분포만으로는
 * 경로를 바꿀 이유가 생기지 않는다. 출발지에서 목적지로 가는 어떤 길을 골라도
 * 결국 같은 띠를 지나기 때문이다.
 *
 * 실제 도시의 대기질은 그렇게 매끄럽지 않다. 특히 대전에는 갑천·유등천·대전천이
 * 시내를 관통하고, 그 하천변은
 *   - 좌우가 트여 있어 오염물질이 정체되지 않고 확산되며
 *   - 차도에서 떨어져 있어 교통 배출의 직접 영향이 작고
 *   - 자전거도로와 산책로가 깔려 있어 실제로 이동 경로로 쓸 수 있다
 * 는 점에서 주변 시가지와 뚜렷하게 다르다.
 *
 * 대전 사람이 실제로 선택할 수 있는 대안 경로가 하천변이라는 점에서,
 * 이 보정은 이 서비스가 대전에 특화됐다고 말할 수 있는 근거이기도 하다.
 *
 * ── 한계 ────────────────────────────────────────────────
 * 아래 하천 좌표는 실제 물길을 몇 개의 꺾은선으로 단순화한 근사치다.
 * 감쇠 폭(-22%)도 도로변·개방공간 농도 차이에 관한 일반적인 관측 범위를 참고한
 * 추정이며, 대전에서 직접 측정한 값이 아니다.
 * 화면에는 추정 모델임을 밝힌다. (/guide 참조)
 */

/** [위도, 경도] 꺾은선 */
type Line = [number, number][];

export interface Corridor {
  name: string;
  line: Line;
  /** 가장 가까울 때의 위험도 감소율 */
  maxReduction: number;
  /** 효과가 0이 되는 거리 (m) */
  falloffM: number;
}

export const RIVER_CORRIDORS: Corridor[] = [
  {
    name: '갑천',
    line: [
      [36.2680, 127.3400],
      [36.3100, 127.3450],
      [36.3480, 127.3560],
      [36.3800, 127.3750],
      [36.4100, 127.3960],
      [36.4450, 127.4180],
    ],
    maxReduction: 0.22,
    falloffM: 900,
  },
  {
    name: '유등천',
    line: [
      [36.2760, 127.4020],
      [36.3050, 127.4030],
      [36.3300, 127.3980],
      [36.3600, 127.3930],
      [36.4000, 127.3940],
    ],
    maxReduction: 0.2,
    falloffM: 800,
  },
  {
    name: '대전천',
    line: [
      [36.2900, 127.4400],
      [36.3150, 127.4330],
      [36.3350, 127.4270],
      [36.3600, 127.4120],
      [36.3800, 127.4000],
    ],
    maxReduction: 0.18,
    falloffM: 700,
  },
];

const LAT_TO_M = 111_320;
const LNG_TO_M = 111_320 * Math.cos((36.35 * Math.PI) / 180);

/**
 * 이 지점의 위험도에 곱할 계수 (0.78 ~ 1.0).
 * 여러 하천이 겹치면 가장 강한 효과 하나만 적용한다 (중복 감쇠 방지).
 */
export function corridorFactor(lat: number, lng: number): number {
  let best = 1;

  for (const corridor of RIVER_CORRIDORS) {
    const d = distanceToLineM(lat, lng, corridor.line);
    if (d >= corridor.falloffM) continue;

    // 가까울수록 1, 멀수록 0으로 부드럽게 감쇠
    const closeness = 1 - d / corridor.falloffM;
    const factor = 1 - corridor.maxReduction * closeness * closeness;
    best = Math.min(best, factor);
  }

  return best;
}

/** 점에서 꺾은선까지의 최단거리 (m) */
function distanceToLineM(lat: number, lng: number, line: Line): number {
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    min = Math.min(min, distanceToSegmentM(lat, lng, line[i], line[i + 1]));
    if (min === 0) return 0;
  }
  return min;
}

function distanceToSegmentM(
  lat: number,
  lng: number,
  a: [number, number],
  b: [number, number],
): number {
  const px = (lng - a[1]) * LNG_TO_M;
  const py = (lat - a[0]) * LAT_TO_M;
  const bx = (b[1] - a[1]) * LNG_TO_M;
  const by = (b[0] - a[0]) * LAT_TO_M;

  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}
