/**
 * 요금제 정의.
 *
 * ── 수익 모델에서의 위치 ────────────────────────────────
 * 광고·제휴 커머스가 "많은 사람에게 조금씩" 버는 축이라면, 구독은
 * "자주 쓰는 사람에게 꾸준히" 버는 축이다. 매일 경로를 확인하는 사람에게는
 * 광고가 거슬리고, 알림과 경로 비교가 필요하다.
 *
 * ── 왜 4단계인가 ────────────────────────────────────────
 * 무료 ↔ 프리미엄 둘뿐이면 "광고만 없으면 되는데 3천원은 부담"인 사람과
 * "부모님 것까지 하나로 묶고 싶다"는 사람이 갈 곳이 없다. 두 요구는 성격이
 * 완전히 다르다 — 앞은 가격 저항, 뒤는 인원. 그래서 라이트(광고 제거만)와
 * 패밀리(계정 공유)를 양쪽 끝에 둔다.
 *
 * 특히 이 서비스의 주 사용자는 호흡기가 약한 고령층이고, 실제로 요금을 내는
 * 사람은 그 자녀인 경우가 많다. 패밀리는 그 구조에 맞춘 요금제다.
 *
 * ── 지금은 결제가 없다 ──────────────────────────────────
 * 실제 결제(PG 연동)는 사업자등록이 필요해서 붙이지 않았다.
 * 대신 마이페이지·요금제 화면의 체험 전환으로 요금제를 바꿔 볼 수 있게 해서,
 * "구독하면 화면이 어떻게 달라지는가"를 직접 확인할 수 있게 했다.
 *
 * 나중에 실제 결제를 붙일 때는 lib/subscription/usePlan.ts 의 저장소를
 * 서버 구독 상태 조회로 바꾸면 된다. 게이팅이 걸린 화면들은 손대지 않아도 된다.
 */

export type PlanId = 'free' | 'lite' | 'premium' | 'family';

/** 화면·비교표에 나오는 순서 */
export const PLAN_ORDER: PlanId[] = ['free', 'lite', 'premium', 'family'];

/**
 * 요금제가 실제로 여는 것들.
 *
 * 화면 게이팅은 요금제 이름이 아니라 이 값들만 본다.
 *   ✗ if (plan === 'premium')      → 요금제가 늘어날 때마다 조건이 늘어난다
 *   ○ if (capabilities.routeCompare) → 요금제가 늘어나도 화면은 그대로다
 */
export interface PlanCapabilities {
  /** 배너 광고를 띄우는가 */
  ads: boolean;
  /** 경로 3안 비교 + 구간별 지표 기여도 */
  routeCompare: boolean;
  /** 저장할 수 있는 관심 지역 수 */
  favorites: number;
  /** 위험 등급 자동 알림 */
  alerts: boolean;
  /** 함께 쓸 수 있는 가족 계정 수 (본인 포함). 1이면 공유 불가 */
  familySeats: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** 월 요금 (원). 0이면 무료 */
  monthlyPrice: number;
  tagline: string;
  /** 요금제 카드에 강조 표시할지 */
  featured?: boolean;
  capabilities: PlanCapabilities;
}

/** 무료·라이트에서 저장할 수 있는 관심 지역 수 */
export const FREE_FAVORITE_LIMIT = 1;

/** 관심 지역을 사실상 제한하지 않는다는 뜻 */
export const UNLIMITED_FAVORITES = 99;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: '무료',
    monthlyPrice: 0,
    tagline: '가입 없이 오늘의 위험도와 추천 경로를 확인합니다.',
    capabilities: {
      ads: true,
      routeCompare: false,
      favorites: FREE_FAVORITE_LIMIT,
      alerts: false,
      familySeats: 1,
    },
  },
  lite: {
    id: 'lite',
    name: '라이트',
    // 예시 금액이다. 실제 판매가는 결제 연동 시점에 정한다.
    monthlyPrice: 1500,
    tagline: '기능은 그대로, 광고만 없이. 매일 잠깐씩 확인하는 분께.',
    capabilities: {
      ads: false,
      routeCompare: false,
      favorites: FREE_FAVORITE_LIMIT,
      alerts: false,
      familySeats: 1,
    },
  },
  premium: {
    id: 'premium',
    name: '프리미엄',
    monthlyPrice: 2900,
    tagline: '매일 다니는 길이 있다면. 경로를 비교하고 알림을 받습니다.',
    featured: true,
    capabilities: {
      ads: false,
      routeCompare: true,
      favorites: UNLIMITED_FAVORITES,
      alerts: true,
      familySeats: 1,
    },
  },
  family: {
    id: 'family',
    name: '패밀리',
    monthlyPrice: 4900,
    tagline: '부모님 것까지 하나로. 최대 4명이 각자 관심 지역과 알림을 씁니다.',
    capabilities: {
      ads: false,
      routeCompare: true,
      favorites: UNLIMITED_FAVORITES,
      alerts: true,
      familySeats: 4,
    },
  },
};

export const FAMILY_SEATS = PLANS.family.capabilities.familySeats;

export interface PlanFeature {
  /** 비교표에 쓰는 항목 이름 */
  label: string;
  /** 요금제별 표시값. false면 미제공 */
  values: Record<PlanId, string | false>;
  /** 요금제 사이에서 실제로 갈리는 항목인지 (표에서 강조) */
  highlight?: boolean;
}

export const PLAN_FEATURES: PlanFeature[] = [
  {
    label: '오늘 위험도 확인',
    values: { free: '제공', lite: '제공', premium: '제공', family: '제공' },
  },
  {
    label: '자치구·행정동 위험 지도',
    values: { free: '제공', lite: '제공', premium: '제공', family: '제공' },
  },
  {
    label: '화면 글자 크기 조절',
    // 접근성은 요금제로 나누지 않는다 (lib/a11y/uiScale.ts 참고)
    values: { free: '제공', lite: '제공', premium: '제공', family: '제공' },
  },
  {
    label: '배너 광고',
    values: { free: '표시', lite: '제거', premium: '제거', family: '제거' },
    highlight: true,
  },
  {
    label: '경로 비교',
    values: {
      free: '추천 경로 1개',
      lite: '추천 경로 1개',
      premium: '3안 전체 비교',
      family: '3안 전체 비교',
    },
    highlight: true,
  },
  {
    label: '구간별 지표 기여도',
    values: { free: false, lite: false, premium: '제공', family: '제공' },
    highlight: true,
  },
  {
    label: '관심 지역 즐겨찾기',
    values: {
      free: `${FREE_FAVORITE_LIMIT}곳`,
      lite: `${FREE_FAVORITE_LIMIT}곳`,
      premium: '여러 곳',
      family: '여러 곳',
    },
    highlight: true,
  },
  {
    label: '위험 등급 자동 알림',
    values: { free: false, lite: false, premium: '기준 등급 설정', family: '기준 등급 설정' },
    highlight: true,
  },
  {
    label: '가족 계정',
    values: { free: false, lite: false, premium: false, family: `최대 ${FAMILY_SEATS}인` },
    highlight: true,
  },
];

export function formatPrice(won: number): string {
  return won === 0 ? '무료' : `월 ${won.toLocaleString('ko-KR')}원`;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}
