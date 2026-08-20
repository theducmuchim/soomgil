import type { IndicatorId, Season } from '@/types';

export interface SeasonMeta {
  id: Season;
  label: string; // '봄'
  /** 이 계절로 판정되는 달 */
  months: number[];
  /**
   * 이번 계절의 핵심 지표와 종합 점수 가중치. 합은 1.0.
   * 화면의 "지금 대전의 핵심 위험" 카드는 이 순서대로 그린다.
   */
  weights: Partial<Record<IndicatorId, number>>;
  /**
   * 계절이 넘어가도 아직 서비스 기간이 남아 있어 함께 보여줄 지표.
   * 예: 꽃가루 서비스 기간은 3~6월이라 6월(여름)에도 소나무·참나무를 계속 노출한다.
   * INDICATORS[id].serviceMonths 로 실제 가용 여부를 한 번 더 확인한다.
   */
  carryOver: IndicatorId[];
  /** 히어로·배지에 쓰는 한 줄 설명 */
  headline: string;
}

/**
 * 계절 구분
 *
 * 달력상 계절은 3-5 / 6-8 / 9-11 / 12-2 로 나눈다.
 * 다만 꽃가루농도위험지수(소나무·참나무)의 실제 서비스 기간은 3월~6월이므로
 * 6월에는 여름 지표(폭염·오존)와 봄 지표(꽃가루)를 함께 노출한다(carryOver).
 * 즉 "봄철 꽃가루 안내"는 3월에 시작해 6월까지 이어진다.
 */
export const SEASONS: Record<Season, SeasonMeta> = {
  spring: {
    id: 'spring',
    label: '봄',
    months: [3, 4, 5],
    weights: {
      oakPollen: 0.3,
      pinePollen: 0.25,
      yellowDust: 0.25,
      pm10: 0.2,
    },
    carryOver: [],
    headline: '꽃가루와 황사가 함께 몰리는 시기입니다.',
  },
  summer: {
    id: 'summer',
    label: '여름',
    months: [6, 7, 8],
    weights: {
      heat: 0.45,
      ozone: 0.4,
      pm25: 0.15,
    },
    // 꽃가루 서비스 기간(3~6월)이 6월까지라 6월에는 함께 표시된다
    carryOver: ['pinePollen', 'oakPollen'],
    headline: '체감온도와 오존이 하루 중 시간대에 따라 크게 변합니다.',
  },
  autumn: {
    id: 'autumn',
    label: '가을',
    months: [9, 10, 11],
    weights: {
      weedPollen: 0.4,
      pm10: 0.3,
      pm25: 0.3,
    },
    carryOver: [],
    headline: '돼지풀 등 잡초류 꽃가루와 미세먼지가 겹칩니다.',
  },
  winter: {
    id: 'winter',
    label: '겨울',
    months: [12, 1, 2],
    weights: {
      pm25: 0.35,
      pm10: 0.25,
      yellowDust: 0.2,
      cold: 0.2,
    },
    carryOver: [],
    headline: '대기정체로 미세먼지가 쌓이고 한파가 겹칩니다.',
  },
};

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];
