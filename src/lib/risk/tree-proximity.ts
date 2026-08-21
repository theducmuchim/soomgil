import { loadStreetTrees, type StreetTreeLine } from '@/data/street-trees';
import { LAT_TO_M, LNG_TO_M } from '@/lib/routing/geometry';

/**
 * 가로수 근접 보정 — 봄철 꽃가루 전용.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────
 * 꽃가루농도위험지수는 행정동보다도 훨씬 넓은 단위로 나온다. 그런데 실제로
 * 소나무·참나무 꽃가루를 얼마나 마시는지는 **그 나무 옆을 지나가느냐**에 크게 좌우된다.
 * 참나무 가로수길을 따라 15분 걷는 것과, 가로수가 없는 이면도로로 같은 동을
 * 통과하는 것은 노출이 다르다. 지역 단위 지수만으로는 이 차이가 사라진다.
 *
 * ── 적용 범위를 좁게 잡은 이유 ───────────────────────────
 * 이 보정은 **소나무·참나무 꽃가루에만** 건다.
 *
 *  - 잡초류(돼지풀 등) 꽃가루에는 걸지 않는다. 가로수 데이터로는 하천변·유휴지의
 *    잡초 분포를 알 수 없다. 나무가 많다고 잡초가 많은 것도 아니라, 억지로 적용하면
 *    근거 없는 숫자가 된다.
 *  - 미세먼지·오존에도 걸지 않는다. 대기 중 오염물질 농도는 가로수 위치와 무관하다.
 *
 * 종합 점수 전체가 아니라 꽃가루가 기여한 몫에만 곱하는 것도 같은 이유다.
 * (lib/risk/route-score.ts 에서 contributions 로 꽃가루 몫을 떼어낸다)
 */

/** 이 거리 안쪽이면 가로수 바로 옆을 지난다고 본다 */
const NEAR_M = 15;

/** 이 거리부터는 영향이 없다 — 사이 구간은 부드럽게 줄어든다 */
const FALLOFF_M = 60;

/** 이 거리 안에 소나무·참나무 가로수가 하나도 없으면 노출이 낮다고 본다 */
const ISOLATED_M = 150;

/** 가로수 바로 옆에서의 최대 증가폭 */
const MAX_BOOST = 0.45;

/** 주변에 아무 가로수도 없을 때의 감소폭 */
const ISOLATED_REDUCTION = 0.2;

/**
 * 가로수 밀도 보정.
 *
 * 표준데이터의 가로수수량으로 밀도를 가늠한다. 그루 수가 많은 길일수록
 * 같은 거리에서도 꽃가루를 더 많이 만난다. 다만 수량 차이가 그대로 노출 차이는
 * 아니므로 영향을 완만하게 눌러둔다(제곱근).
 */
function densityWeight(line: StreetTreeLine): number {
  const reference = 300; // 대전 가로수길의 대략적인 중간 규모
  return Math.min(Math.sqrt(line.count / reference), 1.6);
}

/** 점에서 선분까지의 최단거리 (m) */
function distanceToLineM(
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

/**
 * 이 좌표에서 소나무·참나무 꽃가루 노출에 곱할 계수.
 *
 * 반환 범위는 대략 0.8 ~ 1.7 이다.
 *   가로수 바로 옆      → 1보다 크다 (노출 증가)
 *   150m 안에 아무것도  → 1보다 작다 (노출 감소)
 *   그 사이             → 1에 가깝다
 */
export function treeProximityFactor(lat: number, lng: number): number {
  const lines = loadStreetTrees();

  let nearest = Infinity;
  let bestBoost = 0;

  for (const line of lines) {
    const d = distanceToLineM(lat, lng, line.start, line.end);
    if (d < nearest) nearest = d;
    if (d >= FALLOFF_M) continue;

    // 가까울수록 1, 멀수록 0으로 부드럽게 감쇠
    const closeness =
      d <= NEAR_M ? 1 : 1 - (d - NEAR_M) / (FALLOFF_M - NEAR_M);
    const boost = MAX_BOOST * closeness * closeness * densityWeight(line);

    // 여러 가로수길이 겹치면 가장 강한 것 하나만 쓴다 (중복 가산 방지)
    if (boost > bestBoost) bestBoost = boost;
  }

  if (bestBoost > 0) return 1 + bestBoost;

  /*
   * 주변에 소나무·참나무 가로수가 전혀 없는 구간.
   * 폭 좁은 골목이나 건물로 둘러싸인 길이 여기 해당한다. 발생원에서 멀고
   * 바람도 덜 통해 같은 동 안에서도 꽃가루를 덜 만난다.
   */
  if (nearest > ISOLATED_M) return 1 - ISOLATED_REDUCTION;

  return 1;
}

/** 화면 설명에 쓰는 값 — 지금 지점이 가로수길에 얼마나 가까운지 */
export function nearestTreeLine(
  lat: number,
  lng: number,
): { line: StreetTreeLine; distanceM: number } | null {
  let best: { line: StreetTreeLine; distanceM: number } | null = null;

  for (const line of loadStreetTrees()) {
    const d = distanceToLineM(lat, lng, line.start, line.end);
    if (!best || d < best.distanceM) best = { line, distanceM: Math.round(d) };
  }

  return best;
}
