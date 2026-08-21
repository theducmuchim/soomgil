/**
 * 요금제 정의.
 *
 * ── 수익 모델에서의 위치 ────────────────────────────────
 * 광고·제휴 커머스가 "많은 사람에게 조금씩" 버는 축이라면, 구독은
 * "자주 쓰는 사람에게 꾸준히" 버는 축이다. 매일 경로를 확인하는 사람에게는
 * 광고가 거슬리고, 알림과 경로 비교가 필요하다.
 *
 * ── 지금은 결제가 없다 ──────────────────────────────────
 * 실제 결제(PG 연동)는 사업자등록이 필요해서 붙이지 않았다.
 * 대신 마이페이지의 체험 토글로 프리미엄 상태를 켜고 끌 수 있게 해서,
 * "구독하면 화면이 어떻게 달라지는가"를 직접 확인할 수 있게 했다.
 *
 * 나중에 실제 결제를 붙일 때는 lib/subscription/usePremium.ts 의 저장소를
 * 서버 구독 상태 조회로 바꾸면 된다. 게이팅이 걸린 화면들은 손대지 않아도 된다.
 */

export type PlanId = 'free' | 'premium';

export interface PlanFeature {
  /** 비교표에 쓰는 항목 이름 */
  label: string;
  /** 무료 플랜에서의 값 (false면 미제공) */
  free: string | false;
  /** 프리미엄 플랜에서의 값 */
  premium: string;
  /** 이 항목이 프리미엄의 핵심 차별점인지 */
  highlight?: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** 월 요금 (원). 0이면 무료 */
  monthlyPrice: number;
  tagline: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: '무료',
    monthlyPrice: 0,
    tagline: '가입 없이 오늘의 위험도와 추천 경로를 확인합니다.',
  },
  premium: {
    id: 'premium',
    name: '프리미엄',
    // 예시 금액이다. 실제 판매가는 결제 연동 시점에 정한다.
    monthlyPrice: 2900,
    tagline: '매일 다니는 길이 있다면. 광고 없이, 경로를 비교해서.',
  },
};

export const PLAN_FEATURES: PlanFeature[] = [
  {
    label: '오늘 위험도 확인',
    free: '제공',
    premium: '제공',
  },
  {
    label: '자치구·행정동 위험 지도',
    free: '제공',
    premium: '제공',
  },
  {
    label: '배너 광고',
    free: '표시',
    premium: '표시 안 함',
    highlight: true,
  },
  {
    label: '경로 안내',
    free: '추천 경로 1개',
    premium: '3안 전체 비교',
    highlight: true,
  },
  {
    label: '지표별 상세 기여도',
    free: false,
    premium: '경로 구간별 제공',
    highlight: true,
  },
  {
    label: '관심 지역 즐겨찾기',
    free: '1곳',
    premium: '자치구 전체',
    highlight: true,
  },
  {
    label: '위험 등급 자동 알림',
    free: false,
    premium: '기준 등급 설정 가능',
    highlight: true,
  },
  {
    label: '가족 계정 공유',
    free: false,
    premium: '최대 4명',
  },
];

/** 무료 플랜에서 저장할 수 있는 관심 지역 수 */
export const FREE_FAVORITE_LIMIT = 1;

export function formatPrice(won: number): string {
  return won === 0 ? '무료' : `월 ${won.toLocaleString('ko-KR')}원`;
}
