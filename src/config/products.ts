import type { IndicatorId, Season } from '@/types';

/**
 * 계절 맞춤 상품 추천 (제휴 커머스).
 *
 * ── 수익 모델 ──────────────────────────────────────────
 * 이 서비스는 "지금 위험하다"까지 알려주고 끝나지 않고, 그 위험에 대응할
 * 수단까지 이어준다. 꽃가루 지수가 매우높음인 날 마스크를, 폭염경보인 날
 * 쿨링용품을 보여주는 식이다. 사용자 입장에서는 맥락에 맞는 안내이고,
 * 서비스 입장에서는 제휴 수수료 수익원이 된다.
 *
 * ── 지금은 검색 링크만 ─────────────────────────────────
 * 제휴 트래킹 링크(쿠팡파트너스 등)는 성인 명의 사업자 계정이 필요해서
 * 아직 연결하지 않았다. 지금은 일반 쇼핑 검색 결과로 보낸다.
 * 나중에 제휴 링크로 바꿀 때는 ProductCard.tsx 의 buildShoppingUrl() 한 곳만
 * 고치면 된다. 상품 데이터는 건드릴 필요가 없다.
 */

export type ProductCategory = '보호구' | '의약품' | '생활용품' | '가전';

export interface Product {
  id: string;
  name: string;
  /** 검색에 쓸 키워드 */
  query: string;
  /** 왜 지금 필요한지 — 반드시 이번 계절의 위험 지표와 연결한다 */
  reason: string;
  /** 이 상품이 대응하는 지표 (config/seasons.ts 의 계절 가중치와 대응) */
  indicator: IndicatorId;
  category: ProductCategory;
  priceHint: string;
  /**
   * 의약품 여부.
   *
   * 국내에서 일반의약품은 온라인 판매가 제한된다. 이런 항목은 "구매하기"로
   * 단정하지 않고 약사 상담 안내를 함께 보여준다.
   */
  requiresPharmacy?: boolean;
}

export const SEASON_PRODUCTS: Record<Season, Product[]> = {
  spring: [
    {
      id: 'spring-mask',
      name: 'KF94 황사·미세먼지 마스크',
      query: 'KF94 마스크',
      reason: '참나무·소나무 꽃가루와 황사가 함께 들어오는 시기입니다.',
      indicator: 'oakPollen',
      category: '보호구',
      priceHint: '1매 300~800원대',
    },
    {
      id: 'spring-antihistamine',
      name: '항히스타민제',
      query: '항히스타민제',
      reason: '꽃가루 지수가 높은 날 알레르기성 비염 증상이 심해집니다.',
      indicator: 'oakPollen',
      category: '의약품',
      priceHint: '약국 상담 후 구매',
      requiresPharmacy: true,
    },
    {
      id: 'spring-eyedrops',
      name: '인공눈물',
      query: '인공눈물',
      reason: '꽃가루와 황사가 눈에 닿으면 결막이 자극받습니다.',
      indicator: 'yellowDust',
      category: '의약품',
      priceHint: '30개입 8,000원대',
    },
  ],

  summer: [
    {
      id: 'summer-sunscreen',
      name: '자외선차단제',
      query: '선크림 SPF50',
      reason: '오존이 치솟는 오후는 일사가 가장 강한 시간대와 겹칩니다.',
      indicator: 'ozone',
      category: '생활용품',
      priceHint: '1만~3만원대',
    },
    {
      id: 'summer-coolscarf',
      name: '쿨링 스카프',
      query: '쿨링스카프 넥쿨러',
      reason: '체감온도 33℃를 넘기면 목덜미 냉각이 체온 상승을 늦춥니다.',
      indicator: 'heat',
      category: '생활용품',
      priceHint: '5,000~2만원대',
    },
    {
      id: 'summer-fan',
      name: '휴대용 선풍기',
      query: '휴대용 선풍기',
      reason: '폭염경보 발효 시 이동 중 체감온도를 낮추는 데 씁니다.',
      indicator: 'heat',
      category: '가전',
      priceHint: '1만~4만원대',
    },
  ],

  autumn: [
    {
      id: 'autumn-mask',
      name: 'KF94 꽃가루·미세먼지 마스크',
      query: 'KF94 마스크',
      reason: '돼지풀 등 잡초 꽃가루와 미세먼지가 함께 오르는 시기입니다.',
      indicator: 'weedPollen',
      category: '보호구',
      priceHint: '1매 300~800원대',
    },
    {
      id: 'autumn-rhinitis',
      name: '비염 완화제',
      query: '비염약',
      reason: '잡초류 꽃가루는 가을철 알레르기성 비염의 주요 원인입니다.',
      indicator: 'weedPollen',
      category: '의약품',
      priceHint: '약국 상담 후 구매',
      requiresPharmacy: true,
    },
    {
      id: 'autumn-nasalwash',
      name: '코 세척기',
      query: '코세척기 비강세척',
      reason: '외출 후 비강에 남은 꽃가루를 씻어내는 데 씁니다.',
      indicator: 'weedPollen',
      category: '생활용품',
      priceHint: '1만~3만원대',
    },
  ],

  winter: [
    {
      id: 'winter-mask',
      name: 'KF94 초미세먼지 마스크',
      query: 'KF94 마스크',
      reason: '대기정체로 초미세먼지가 쌓이는 계절입니다.',
      indicator: 'pm25',
      category: '보호구',
      priceHint: '1매 300~800원대',
    },
    {
      id: 'winter-heatpack',
      name: '핫팩',
      query: '핫팩',
      reason: '한파 특보가 발효되면 체감온도가 영하 15℃까지 내려갑니다.',
      indicator: 'cold',
      category: '생활용품',
      priceHint: '10개 5,000원대',
    },
    {
      id: 'winter-humidifier',
      name: '가습기',
      query: '가습기',
      reason: '난방으로 건조해진 실내는 미세먼지 자극을 키웁니다.',
      indicator: 'pm25',
      category: '가전',
      priceHint: '2만~10만원대',
    },
  ],
};

export function productsFor(season: Season): Product[] {
  return SEASON_PRODUCTS[season];
}
