import type { AreaRisk, IndicatorId, RoadKind } from '@/types';
import { canyonAt } from '@/data/buildings';

/**
 * 도로유형 노출 보정 — 교통 배출 오염물질 전용.
 *
 * ── 무엇을 푸는가 ───────────────────────────────────────
 * 미세먼지·오존 관측값은 도시대기측정소 단위, 우리 위험도는 행정동 단위다.
 * 그래서 같은 동을 지나는 경로는 큰길로 가든 공원길로 가든 값이 똑같이 나온다.
 * 실제로 걷는 사람이 마시는 양은 그렇지 않다.
 *
 * 정부 데이터의 공간 해상도를 우리가 올릴 방법은 없다. 대신 **경로 위의 어느
 * 지점이 차량 배출원에서 얼마나 떨어져 있는지**는 TMAP 응답에 이미 들어 있다.
 * 지금까지 좌표만 쓰고 버리던 roadType·facilityType 이 그것이다.
 *
 * ── 근거 ────────────────────────────────────────────────
 * 도로변 대기질 연구에서 반복 확인되는 두 가지에 기댄다.
 *
 *  1. 배출원과의 거리에 따른 급격한 감쇠
 *     교통 기인 입자상 물질(PM2.5·블랙카본·초미세입자)의 농도는 차선에서
 *     멀어질수록 빠르게 떨어진다. 특히 처음 10~20m 구간의 기울기가 가파르다.
 *     차도와 분리된 인도, 차량이 아예 들어오지 못하는 보행자 전용가로,
 *     차도 위를 함께 걷는 길은 같은 동네여도 노출이 다르다.
 *
 *  2. street canyon 효과
 *     양옆이 건물로 막힌 도로는 배출된 오염물질이 위로 빠져나가지 못하고
 *     보행 높이에 머문다. 얼마나 갇히는지는 **건물 높이 ÷ 도로 폭**(종횡비 H/W)
 *     으로 가늠한다. H/W 가 대략 0.5를 넘으면 도로 위 공기가 위쪽 흐름과
 *     분리되기 시작하고, 1을 넘으면 소용돌이가 갇힌 채 도는 형태가 된다.
 *
 * ── 두 축은 서로 다른 것을 본다 ─────────────────────────
 *   도로 유형 = 배출원과의 거리   (차선에서 얼마나 떨어져 걷는가)
 *   캐니언     = 환기 조건         (배출된 것이 얼마나 빠져나가는가)
 * 물리적으로 다른 현상이라 곱한다. 좁은 골목이어도 건물이 낮으면 잘 빠지고,
 * 인도가 넓어도 고층 건물이 양옆을 막고 있으면 갇힌다.
 *
 * ⚠ 이 보정은 **관측값이 아니라 추정**이다. 도로 유형별·캐니언별 상대적 차이를
 *   반영할 뿐, 실제 농도를 도로 단위로 측정한 값이 아니다. /guide 에 밝힌다.
 *
 * ── 왜 별도 파일인가 ────────────────────────────────────
 * 이미 있는 두 보정과 원리가 다르다.
 *   가로수 근접 (tree-proximity)  : 발생원과의 거리 — 꽃가루에만
 *   하천축·풍향 (corridors, route-score) : 확산 조건과 이동 — 전체에
 *   도로 유형 (이 파일)            : 배출원과의 거리 — 교통 오염물질에만
 * 곱하는 대상이 달라서 한 체인에 섞으면 무엇에 무엇이 걸렸는지 알 수 없게 된다.
 *
 */

/* ── 도로 유형 ─────────────────────────────────────────── */

/**
 * TMAP roadType → 노출 관점의 도로 유형.
 *
 * 21 보도(차도와 분리) · 22 차도·보도 혼재 · 23 차량진입불가 · 24 차도
 */
export function roadKindOf(roadType: number | null | undefined): RoadKind {
  switch (roadType) {
    case 23:
      return 'carFree';
    case 21:
      return 'separated';
    case 22:
      return 'mixed';
    case 24:
      return 'carOnly';
    default:
      return 'unknown';
  }
}

export interface RoadKindMeta {
  label: string;
  /** 교통 기인 오염물질 노출에 곱할 계수 */
  factor: number;
  note: string;
}

/**
 * 도로 유형별 계수.
 *
 * ── 왜 '분리된 인도'가 1.00 인가 ────────────────────────
 * 대전 보행 경로의 76%가 이 유형이다(대전 10개 경로 실측). 여기를 기준점으로
 * 두어야 보정이 **경로 사이의 차이**만 만들고 경로 전체 점수를 통째로
 * 밀어 올리거나 내리지 않는다. 도시대기측정소도 대개 이런 위치에 있어,
 * 관측값이 대표하는 상황과도 가장 가깝다.
 *
 * 계수 폭은 보수적으로 잡았다. 도로변 노출 연구가 보고하는 차이는 이보다 큰
 * 경우가 많지만, 우리가 가진 건 도로 유형 하나뿐이고 차로 수·교통량·건물
 * 높이는 모른다. 근거보다 큰 숫자를 쓰면 정밀해 보이는 만큼 틀리기도 쉽다.
 */
export const ROAD_KINDS: Record<RoadKind, RoadKindMeta> = {
  carFree: {
    label: '차량 진입 불가',
    factor: 0.85,
    note: '공원길·보행자 전용가로. 차량 배출원이 없습니다.',
  },
  separated: {
    label: '분리된 인도',
    factor: 1.0,
    note: '차도와 나뉜 보도. 이 서비스의 기준 도로 유형입니다.',
  },
  mixed: {
    label: '차도·보도 혼재',
    factor: 1.15,
    note: '차도와 보도가 나뉘지 않아 차량 옆을 그대로 걷습니다.',
  },
  carOnly: {
    label: '차도',
    factor: 1.3,
    note: '차도 위를 걷는 구간. 배출원과 가장 가깝습니다.',
  },
  unknown: {
    label: '유형 미상',
    factor: 1.0,
    note: '도로 유형 정보가 없어 보정하지 않았습니다.',
  },
};

/* ── street canyon (건물 높이 ÷ 도로 폭) ───────────────── */

/**
 * 도로명 접미사로 도로 폭을 추정한다.
 *
 * 종횡비를 구하려면 도로 폭이 필요한데, TMAP 응답에도 건물 데이터에도 없다.
 * 다행히 **도로명주소법 시행령 제6조**가 접미사로 폭을 규정해 두었다.
 *
 *   대로 : 폭 40m 이상 또는 왕복 8차로 이상
 *   로   : 폭 12m 이상 40m 미만 또는 왕복 2~8차로
 *   길   : 그 밖의 도로
 *
 * 즉 도로명 자체가 폭의 하한을 알려준다. 정확한 실측 폭은 아니지만,
 * 종횡비는 자릿수 수준의 구분만 되어도 의미가 있다 — 0.3인지 1.5인지가
 * 중요하지 0.3인지 0.35인지는 중요하지 않다.
 *
 * 대표값은 각 구간의 아래쪽에서 잡았다. 넓게 잡으면 종횡비가 작아져
 * 보정이 약해지는 쪽이라, 근거가 약할 때 과하게 가지 않는 방향이다.
 */
export function estimateRoadWidthM(roadName: string | null | undefined): number {
  const name = roadName?.trim();
  if (!name) return DEFAULT_WIDTH_M;
  if (name.endsWith('대로')) return 40;
  if (name.endsWith('로')) return 20;
  if (name.endsWith('길')) return 10;
  // '보행자도로' 등 도로명 체계 밖의 이름
  return DEFAULT_WIDTH_M;
}

/**
 * 도로명을 모를 때 쓰는 폭.
 *
 * TMAP 은 인도 구간의 이름을 '보행자도로'로 준다. 그런데 그 인도는 대개
 * 큰 도로를 따라 나 있어서, 이면도로로 가정해 좁게 잡으면 종횡비가 부풀고
 * 보정이 과해진다. 도심 일반 도로 수준(로 등급의 아래쪽)으로 잡는다.
 */
const DEFAULT_WIDTH_M = 20;

/**
 * 종횡비가 이 값을 넘어서면 갇히기 시작한다고 본다.
 * (이 아래에서는 도로 위 공기가 위쪽 흐름과 충분히 섞인다)
 */
const CANYON_ONSET = 0.5;

/** 이 종횡비에서 보정이 최대가 된다 */
const CANYON_SATURATION = 2;

/** 최대 증가폭 */
const CANYON_MAX_BOOST = 0.25;

/**
 * 캐니언이라고 부르기 위한 최소 건물 수.
 *
 * 처음에는 데이터 품질 때문에 둔 조건이었다. 잠정 데이터(OSM)가 눈에 띄는 고층
 * 건물부터 태그돼 있어, 한 동만 기록된 칸의 평균이 실제보다 높게 나왔다.
 *
 * 지금은 국토부 건물통합정보라 그 동네 건물이 전부 들어와 있고, 이 조건은
 * **물리적인 이유로** 남는다. 캐니언은 양옆에 벽이 있어야 생긴다. 들판에 선
 * 20층 건물 한 동은 아무것도 가두지 않는다.
 */
const MIN_BUILDINGS = 3;

export interface CanyonInfo {
  /** 종횡비 H/W */
  aspect: number;
  meanHeightM: number;
  widthM: number;
  /** 노출에 곱할 계수 */
  factor: number;
}

/**
 * 이 지점의 street canyon 보정. 건물 데이터가 없으면 null.
 *
 * null 은 "캐니언이 아니다"가 아니라 **"모른다"**는 뜻이다. 그래서 계수를
 * 걸지 않는다. 산·농지처럼 건물이 없는 곳, 그리고 건축물대장에 높이가 비어 있는
 * 구간이 여기 해당한다 — data/buildings.ts 참고.
 */
export function canyonFactorAt(
  lat: number,
  lng: number,
  roadName: string | null | undefined,
): CanyonInfo | null {
  const sample = canyonAt(lat, lng);
  if (!sample || sample.buildings < MIN_BUILDINGS) return null;

  const widthM = estimateRoadWidthM(roadName);
  const aspect = sample.meanHeightM / widthM;

  const over = Math.min(
    Math.max(aspect - CANYON_ONSET, 0),
    CANYON_SATURATION - CANYON_ONSET,
  );
  const factor =
    1 + CANYON_MAX_BOOST * (over / (CANYON_SATURATION - CANYON_ONSET));

  return {
    aspect: Math.round(aspect * 100) / 100,
    meanHeightM: Math.round(sample.meanHeightM),
    widthM,
    factor: Math.round(factor * 1000) / 1000,
  };
}

/* ── 시설 유형 ─────────────────────────────────────────── */

/**
 * 밀폐 공간 보정.
 *
 * 지하보도·터널은 위가 막혀 있어 배출된 오염물질이 흩어지지 않고 고인다.
 * 짧게 지나가는 구간이라 경로 전체에 미치는 영향은 작지만, 이 구간을
 * 피하는 경로와 지나가는 경로를 구분하려면 반영해야 한다.
 *
 * ── facilityType 대응은 실측으로 확인했다 ───────────────
 * TMAP 문서가 아니라 대전 10개 경로의 실제 응답을 안내 문구와 대조해 얻었다.
 *   14 = 지하보도  ('지하보도 진입 후 32m 이동' 안내 뒤에 오는 구간)
 *   12 = 육교      ('육교 진입 후 77m 이동' 뒤)
 *   15 = 횡단보도  (횡단보도 안내 뒤)
 *    1 = 교량 · 11 = 일반도로
 *
 * 육교(12)에는 보정을 걸지 않는다. 차도 바로 위를 지나가지만 사방이 트여 있어
 * 밀폐 효과가 없다. 배출원에 가까워지는 만큼은 roadType 쪽에서 이미 잡힌다.
 */
const ENCLOSED_FACILITY: Record<number, { label: string; factor: number }> = {
  /** 지하보도 */
  14: { label: '지하보도', factor: 1.2 },
  /** 터널 — 대전 보행 경로에서는 아직 관측하지 못했지만 대응은 해 둔다 */
  2: { label: '터널', factor: 1.25 },
};

export function enclosedFacility(
  facilityType: number | null | undefined,
): { label: string; factor: number } | null {
  if (facilityType == null) return null;
  return ENCLOSED_FACILITY[facilityType] ?? null;
}

/* ── 어떤 지표에 걸 것인가 ─────────────────────────────── */

/**
 * 교통 배출과 관련된 지표, 그리고 도로 유형에 얼마나 민감한가.
 *
 * 꽃가루는 도로 유형과 무관하다(가로수 근접 보정이 따로 본다).
 * 폭염·한파도 도로 유형으로 갈리지 않는다. 남는 건 미세먼지와 오존이다.
 *
 * ── 오존을 0.5 로 낮춘 이유 ─────────────────────────────
 * 오존은 도로변에서 오히려 **낮게** 관측되는 경우가 많다. 차량이 내뿜는
 * 일산화질소가 오존과 반응해 소모시키기 때문이다(NO + O₃ → NO₂ + O₂).
 * 그래서 미세먼지와 같은 크기로 올리면 실제와 반대 방향으로 과하게 간다.
 *
 * 그렇다고 0으로 두지도 않았다. 도로변은 이차 생성 전구물질과 NO₂ 자체의
 * 농도가 높아 호흡기 부담이 큰 곳이고, 이 지표가 대표하는 위험은 그쪽에 가깝다.
 * 방향은 유지하되 반응 크기를 절반으로 줄이는 쪽을 택했다.
 *
 * 이 값 하나만 바꾸면 오존의 도로 민감도를 조정할 수 있다.
 */
const TRAFFIC_SENSITIVITY: Partial<Record<IndicatorId, number>> = {
  pm10: 1,
  pm25: 1,
  ozone: 0.5,
};

/**
 * 한 지점에 걸릴 도로유형 보정 계수.
 *
 * 도로 유형과 밀폐 여부를 곱한다 — 지하보도이면서 차도인 구간은 둘 다 받는다.
 */
export interface ExposureFactors {
  /** 도로 유형 + 밀폐 시설 — 배출원과의 거리 */
  road: number;
  /** street canyon — 환기 조건. 건물 데이터가 없으면 1 */
  canyon: number;
  /** 실제로 곱해지는 값 */
  total: number;
}

/**
 * 한 지점에 걸릴 보정 계수.
 *
 * 두 몫을 나눠 돌려주는 이유는 화면 때문이다. 합쳐 놓으면 "왜 이 구간이 높은가"에
 * 답할 수 없다 — 차도라서인지 고층 건물에 갇혀서인지가 사라진다.
 */
export function roadExposureFactors(point: {
  lat?: number;
  lng?: number;
  roadType?: number | null;
  facilityType?: number | null;
  roadName?: string | null;
}): ExposureFactors {
  const road =
    ROAD_KINDS[roadKindOf(point.roadType)].factor *
    (enclosedFacility(point.facilityType)?.factor ?? 1);

  // 건물 데이터가 있는 구간에만 캐니언 보정이 붙는다
  const canyon =
    point.lat !== undefined && point.lng !== undefined
      ? (canyonFactorAt(point.lat, point.lng, point.roadName)?.factor ?? 1)
      : 1;

  return { road, canyon, total: road * canyon };
}

/* ── 적용 ──────────────────────────────────────────────── */

/**
 * 행정동별 "교통 기인 오염물질이 종합 점수에서 차지하는 몫".
 *
 * 도로 유형은 종합 점수 전체가 아니라 이 몫에만 걸어야 한다. 종합 점수에
 * 그대로 곱하면 꽃가루와 폭염까지 큰길에서 올라가는데, 그건 도로 유형과
 * 아무 상관이 없다.
 *
 * 지표별 민감도(TRAFFIC_SENSITIVITY)를 여기서 미리 곱해 둔다.
 */
function trafficShareByArea(areaRisks: AreaRisk[]): Map<string, number> {
  const shares = new Map<string, number>();

  for (const area of areaRisks) {
    if (area.score <= 0) {
      shares.set(area.areaId, 0);
      continue;
    }

    const weighted = area.breakdown.contributions.reduce((sum, c) => {
      const sensitivity = TRAFFIC_SENSITIVITY[c.id] ?? 0;
      return sum + c.points * sensitivity;
    }, 0);

    // 보정 전 점수 기준으로 몫을 잡는다 — contributions 가 그 단계의 값이다
    const base = area.breakdown.baseScore > 0 ? area.breakdown.baseScore : area.score;
    shares.set(area.areaId, Math.min(weighted / base, 1));
  }

  return shares;
}

export interface RoadAdjustment {
  /** 보정 후 위험도 */
  risk: number;
  /** 도로 유형 몫 */
  roadFactor: number;
  /** street canyon 몫 */
  canyonFactor: number;
}

/**
 * 경로 위 한 점의 위험도에 도로유형 보정을 적용하는 함수를 만든다.
 *
 * 들어오는 risk 는 하천축·풍향 보정이 이미 반영된 실효 위험도다. 그 안에서
 * 교통 오염물질이 차지하는 몫에만 계수를 걸어야 하므로, 값을 통째로 곱하지 않고
 *
 *     보정 후 = risk × (1 + 몫 × (계수 − 1))
 *
 * 로 계산한다. 이렇게 하면 앞 단계에서 어떤 배율이 걸렸든 교통 몫의 비율만
 * 정확히 움직인다.
 */
export function createRoadAdjuster(
  areaRisks: AreaRisk[],
): (point: {
  lat: number;
  lng: number;
  risk: number;
  dongId: string | null;
  roadType?: number | null;
  facilityType?: number | null;
  roadName?: string | null;
}) => RoadAdjustment {
  const shares = trafficShareByArea(areaRisks);

  return (point) => {
    const { road, canyon, total } = roadExposureFactors(point);
    const none = { risk: point.risk, roadFactor: 1, canyonFactor: 1 };

    if (total === 1 || point.risk <= 0) {
      return { risk: point.risk, roadFactor: road, canyonFactor: canyon };
    }

    const share = (point.dongId && shares.get(point.dongId)) || 0;
    if (share <= 0) return none;

    return {
      risk: Math.min(point.risk * (1 + share * (total - 1)), 100),
      roadFactor: road,
      canyonFactor: canyon,
    };
  };
}
