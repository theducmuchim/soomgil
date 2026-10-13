import { getPosition } from 'suncalc';
import { canyonAt } from '@/data/buildings';
import { estimateRoadWidthM } from '@/lib/risk/road-exposure';
import { corridorFactor } from '@/lib/risk/corridors';

/**
 * 야간 조도 추정 — "이 길이 밤에 밝은가".
 *
 * ── 무엇이 없는가를 먼저 밝힌다 ─────────────────────────
 * 우리에게 **가로등 위치 데이터는 없다**. 대전시 가로등 대장은 공개돼 있지만
 * 이 저장소에 들어와 있지 않고, 실시간 점등 상태는 어디에서도 주지 않는다.
 * 그래서 이 모듈이 내놓는 값은 관측이 아니라 **추정**이다. 화면에서도
 * 그렇게 말해야 한다 — "가로등 N개"가 아니라 "밤에 비교적 밝은 길"이다.
 *
 * ── 무엇으로 추정하는가 ─────────────────────────────────
 * 두 가지를 곱한다. 둘 다 이미 가지고 있는 데이터다.
 *
 *   ① 도로명 등급 (TMAP)
 *      대로(40m) · 로(20m) · 길(10m). 가로등은 도로 등급을 따라 설치되고
 *      관리된다. 이건 안전과 오염이 **반대 방향**이라는 뜻이기도 하다 —
 *      낮에 좋은 하천길·골목이 밤에는 가장 어두운 길일 수 있다.
 *
 *   ② 건폐율 (건축물대장 150m 격자)
 *      건물이 빽빽하면 상가 간판·창문·주차장 조명이 길을 비춘다. 건물이
 *      없는 하천변·농지·산자락은 가로등 사이가 그대로 어둠이다.
 *
 * ── 하천변을 따로 빼는 이유 ─────────────────────────────
 * 갑천·유등천 산책로는 낮에는 이 서비스가 가장 추천하는 길이다(확산이 좋아
 * 오염도가 낮다). 그런데 밤에는 인적이 드물고 조명도 띄엄띄엄하다.
 * 같은 길이 시간에 따라 정반대 평가를 받아야 해서, 하천 보정을 조도에서는
 * 감점으로 건다.
 *
 * ── 낮에는 계산하지 않는다 ──────────────────────────────
 * 해가 떠 있으면 이 값은 아무 의미가 없다. 낮에 "밝은 길"을 추천하면
 * 그냥 큰길로 다니라는 말이 된다.
 */

/** 대전 중심 좌표 — 일몰 판정용 */
const DAEJEON = { lat: 36.35, lng: 127.385 };

/**
 * 이 고도 아래로 해가 내려가면 '밤'으로 본다 (도).
 *
 * 0도(일몰)가 아니라 -6도(시민박명 끝)를 쓴다. 해가 막 진 직후에는 하늘이
 * 아직 밝아 가로등이 의미가 없고, 시민박명이 끝나야 인공조명에 의존하게 된다.
 */
const NIGHT_SUN_ALTITUDE_DEG = -6;

/**
 * 도로 폭별 야간 조도 추정치 0~1.
 *
 * ── 왜 도로 '유형'이 아니라 '폭'인가 ────────────────────
 * 처음에는 TMAP 의 roadType(공원길·분리된 인도·혼재·차도)으로 조도를 매겼다.
 * 실측해 보니 경로들의 조도가 0.803~0.835 로 붙어서 '밤에 밝은 길'이 한 번도
 * 붙지 않았다. 원인은 TMAP 이 보행 구간 대부분을 '분리된 인도' 하나로
 * 분류한다는 데 있다 — 대로변 인도와 주택가 골목이 같은 값을 받는다.
 *
 * 도로명 등급은 실제로 갈린다. 대로(40m) · 로(20m) · 길(10m) 이고,
 * 가로등은 도로 등급을 따라 설치·관리된다. 폭이 넓을수록 조명주가 높고
 * 간격이 촘촘하다. 같은 데이터로 '골목 위주'(quiet)도 재고 있어서,
 * 두 니즈가 자연히 반대 방향이 된다 — 밤에는 골목을 포기하고 큰길로 나오는
 * 맞바꿈이 생기는데, 그게 실제로 사람이 하는 선택이다.
 */
const WIDTH_LIGHTING: { widthM: number; lit: number }[] = [
  { widthM: 40, lit: 0.95 }, // 대로 — 가로등이 가장 촘촘하다
  { widthM: 20, lit: 0.75 }, // 로 — 표준적인 시가지 도로
  { widthM: 10, lit: 0.45 }, // 길 — 이면도로·골목. 조명 간격이 넓다
];

/** 도로명을 모를 때 (TMAP 의 '보행자도로' 등) */
const UNKNOWN_LIGHTING = 0.6;

/** 도로 폭에서 조도를 읽는다 */
function lightingFromWidth(roadName: string | null | undefined): number {
  if (!roadName?.trim()) return UNKNOWN_LIGHTING;
  const width = estimateRoadWidthM(roadName);
  const hit = WIDTH_LIGHTING.find((w) => w.widthM <= width);
  return hit?.lit ?? UNKNOWN_LIGHTING;
}

/** 건폐율이 이 값을 넘으면 건물 조명이 충분하다고 본다 */
const BUILT_RATIO_SATURATION = 0.35;

/** 건물 조명이 최종 조도에 기여하는 최대 몫 */
const BUILT_LIGHT_WEIGHT = 0.35;

/** 하천변에서 깎을 최대 몫 */
const CORRIDOR_PENALTY = 0.25;

/** 지금 이 시각이 '밤'인가 */
export function isNightAt(at: Date): boolean {
  const sun = getPosition(at, DAEJEON.lat, DAEJEON.lng);
  return (sun.altitude * 180) / Math.PI < NIGHT_SUN_ALTITUDE_DEG;
}

/**
 * 한 지점의 야간 조도 추정 0~1.
 *
 * 1에 가까울수록 밝다. 낮이면 null — 값이 없는 게 아니라 물을 이유가 없다.
 */
export function lightingAt(point: {
  lat: number;
  lng: number;
  roadName?: string | null;
}): number {
  const road = lightingFromWidth(point.roadName);

  /*
   * 건물 조명은 도로 조명에 **더한다**. 곱하지 않는 이유는, 건물이 없다고
   * 해서 가로등까지 없어지지는 않기 때문이다. 건물은 가산 요소다.
   */
  const cell = canyonAt(point.lat, point.lng);
  const built = cell
    ? Math.min(cell.builtRatio / BUILT_RATIO_SATURATION, 1) * BUILT_LIGHT_WEIGHT
    : 0;

  /*
   * 하천 보정은 corridorFactor 를 되짚어 쓴다.
   * 그 함수는 하천에 가까울수록 1보다 작은 값(오염 감소)을 주므로,
   * 1에서 뺀 만큼이 '하천에 얼마나 가까운가'가 된다.
   */
  const riverness = Math.max(0, 1 - corridorFactor(point.lat, point.lng));
  const penalty = Math.min(riverness * 4, 1) * CORRIDOR_PENALTY;

  return clamp01(road + built - penalty);
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}
