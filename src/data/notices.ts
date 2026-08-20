export type NoticeCategory = 'update' | 'data' | 'maintenance' | 'guide';

export interface Notice {
  /** URL 세그먼트 — /notice/[slug] */
  slug: string;
  category: NoticeCategory;
  title: string;
  /** 목록에 보이는 한 줄 요약 */
  summary: string;
  /** 상세 본문 — 문단 배열 */
  body: string[];
  /** 작성일 (KST, ISO 8601) */
  publishedAt: string;
  /** 목록 최상단 고정 */
  pinned?: boolean;
}

export const NOTICE_CATEGORY: Record<NoticeCategory, { label: string; tone: string }> = {
  update: { label: '업데이트', tone: 'bg-brand-50 text-brand-700' },
  data: { label: '데이터', tone: 'bg-risk-low/10 text-risk-low' },
  maintenance: { label: '점검', tone: 'bg-risk-moderate/12 text-risk-moderate' },
  guide: { label: '안내', tone: 'bg-surface-sunken text-ink-500' },
};

/**
 * 공지 목업.
 *
 * 실제 서비스라면 CMS나 DB에서 오겠지만, 프로토타입에서는 이 파일이 원본이다.
 * 심사 시연 중 "빈 게시판"이 보이지 않도록 실제 개발 과정에 있었던 일들로 채웠다.
 */
export const NOTICES: Notice[] = [
  {
    slug: 'season-switch-summer',
    category: 'update',
    title: '계절 전환 안내 — 여름 지표(폭염·오존)로 자동 전환됩니다',
    summary:
      '6월부터 핵심 위험 지표가 꽃가루에서 체감온도·오존으로 넘어갑니다. 꽃가루 지수는 서비스 기간이 끝나는 6월까지 함께 표시됩니다.',
    body: [
      '숨쉬는길은 계절이 바뀌면 종합 위험도를 계산하는 핵심 지표가 자동으로 전환됩니다. 6월부터는 체감온도(폭염)와 오존이 주 지표가 되고, 초미세먼지가 보조 지표로 들어갑니다.',
      '기상청 꽃가루농도위험지수(소나무·참나무)의 서비스 기간은 3월부터 6월까지입니다. 따라서 6월 한 달 동안은 여름 지표와 봄 꽃가루 지표가 함께 표시되며, 7월부터는 꽃가루 항목이 화면에서 사라집니다.',
      '이 기간의 꽃가루 지수는 참고용으로만 표시되고 종합 위험도 점수에는 반영되지 않습니다. 계절이 바뀌는 시점에 점수가 갑자기 튀는 것을 막기 위한 처리입니다.',
    ],
    publishedAt: '2026-06-01T09:00:00+09:00',
    pinned: true,
  },
  {
    slug: 'stagnation-index-applied',
    category: 'update',
    title: '대기정체지수 보정을 위험도 계산에 반영했습니다',
    summary:
      '분지 지형인 대전의 특성을 반영해, 대기정체지수에 따라 종합 위험도가 최대 35%까지 가산됩니다. 보정 전후 점수를 함께 표시합니다.',
    body: [
      '대전은 사방이 산으로 둘러싸인 분지라 같은 양의 오염물질이 배출돼도 빠져나가지 못하고 쌓입니다. 기존 대기질 지수는 이 지형 효과를 따로 반영하지 않습니다.',
      '숨쉬는길은 기상청 대기정체지수를 받아 종합 위험도에 보정계수로 곱합니다. 정체가 심할수록 계수가 커지며 최대 1.35배(+35%)까지 올라갑니다.',
      '보정 결과만 보여주면 어디까지가 지형 때문인지 알 수 없기 때문에, 화면에는 보정 전 점수와 보정 후 점수, 그리고 상승률을 모두 표시합니다.',
    ],
    publishedAt: '2026-05-20T14:00:00+09:00',
  },
  {
    slug: 'apparent-temp-formula',
    category: 'data',
    title: '체감온도 산출 방식 변경 안내',
    summary:
      '기상청 체감온도(대상·환경별) 지수 서비스 종료에 따라, 단기예보의 기온·습도·풍속으로 체감온도를 자체 산출합니다.',
    body: [
      '기상청 생활기상지수의 체감온도(대상·환경별) 세부 지수가 2026년 5월 1일자로 서비스를 종료했습니다.',
      '숨쉬는길은 이를 대신해 기상청 단기예보의 기온(TMP)·상대습도(REH)·풍속(WSD)을 받아 체감온도를 직접 계산합니다. 여름철은 습구온도 기반 공식을, 겨울철은 풍속냉각지수를 적용합니다.',
      '또한 폭염·한파 특보가 발효 중이면 특보 기준선(폭염경보 35℃, 한파경보 -15℃)까지 값을 보정해, 산출식이 실제 발효 상황을 놓치지 않도록 했습니다.',
      '이 값은 자체 산출값으로 기상청 공식 발표 체감온도와 소수점 단위로 다를 수 있습니다. 자세한 내용은 이용안내의 데이터 출처를 확인해 주세요.',
    ],
    publishedAt: '2026-05-02T11:00:00+09:00',
  },
  {
    slug: 'station-based-resolution',
    category: 'data',
    title: '자치구별 미세먼지 해상도를 측정소 기준으로 높였습니다',
    summary:
      '기상청 단기예보 격자는 약 5km 간격이라 대전 안에서는 인접 구가 같은 값을 공유합니다. 미세먼지·오존은 에어코리아 측정소별 실측으로 대체했습니다.',
    body: [
      '기상청 단기예보의 격자는 약 5km 간격입니다. 대전은 시 전체가 25km 남짓이라 동구와 중구처럼 붙어 있는 구는 같은 격자에 묶여 동일한 예보값을 받게 됩니다.',
      '기온·습도·풍속은 실제로도 구별 차이가 크지 않아 그대로 사용하지만, 미세먼지와 오존은 도로·산업단지 위치에 따라 구별 편차가 큽니다.',
      '이에 따라 미세먼지·초미세먼지·오존은 에어코리아 도시대기 측정소별 실측값을 받아 자치구 단위로 평균해 사용합니다. 한 구에 측정소가 여러 곳이면 결측을 제외하고 평균합니다.',
    ],
    publishedAt: '2026-04-28T16:30:00+09:00',
  },
  {
    slug: 'service-open',
    category: 'guide',
    title: '숨쉬는길 프로토타입을 공개합니다',
    summary:
      '대전형 대기 위험 회피 내비게이션 숨쉬는길의 시범 버전을 공개합니다. 공공데이터를 조합해 상대적으로 안전한 이동 경로를 안내합니다.',
    body: [
      '숨쉬는길은 대전의 계절별 대기 위험을 실시간으로 분석해, 같은 목적지라도 상대적으로 덜 위험한 경로를 안내하는 서비스입니다.',
      '기존 서비스는 지역 단위 위험도까지만 알려줍니다. 숨쉬는길은 여기에 풍향·풍속과 분지 지형의 대기정체를 더해 경로 단위로 안내합니다.',
      '현재는 프로토타입 단계로, 화면에 표시되는 값은 공공데이터 응답 형태를 그대로 재현한 예시 데이터입니다. 실제 인증키 연동 후 동일한 화면에서 실시간 데이터로 전환됩니다.',
    ],
    publishedAt: '2026-04-15T10:00:00+09:00',
  },
];

/** 최신순 정렬 (고정 공지가 먼저) */
export function sortedNotices(): Notice[] {
  return [...NOTICES].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

export function findNotice(slug: string): Notice | undefined {
  return NOTICES.find((n) => n.slug === slug);
}
