export const SITE = {
  name: '숨쉬는길',
  slug: 'soomgil',
  tagline: '대전형 대기 위험 회피 내비게이션',
  description:
    '대전의 꽃가루·미세먼지·폭염·오존을 공공데이터로 실시간 분석해, 상대적으로 안전한 이동 경로를 안내합니다.',
  url: 'https://soomgil.vercel.app',
} as const;

export interface NavItem {
  href: string;
  label: string;
  /** 헤더 드롭다운/모바일 메뉴에 붙는 한 줄 설명 */
  desc?: string;
}

/** 헤더 주 메뉴 */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/route', label: '경로 안내', desc: '출발지·목적지를 넣고 안전한 길을 비교합니다' },
  { href: '/risk-map', label: '위험 지도', desc: '대전 자치구·행정동 단위 실시간 위험도' },
  { href: '/layers', label: '레이어 지도', desc: '꽃가루·미세먼지·폭염·오존을 겹쳐 봅니다' },
  { href: '/stats', label: '통계', desc: '자치구 비교와 시간대별 추이' },
];

/** 헤더 보조 메뉴 */
export const SECONDARY_NAV: NavItem[] = [
  { href: '/guide', label: '이용안내' },
  { href: '/notice', label: '공지사항' },
  { href: '/about', label: '팀 소개' },
];

/** 푸터 */
export const FOOTER = {
  team: {
    name: '숨쉬는길 팀',
    note: '고등학생 창업 프로토타입 · 공모전 출품작',
    contact: 'soomgil.team@example.com',
  },
  links: [
    { href: '/guide', label: '이용안내' },
    { href: '/notice', label: '공지사항' },
    { href: '/about', label: '팀 소개' },
    { href: '/guide#terms', label: '이용약관' },
    { href: '/guide#privacy', label: '개인정보처리방침' },
  ],
  dataSources: [
    { label: '기상청 꽃가루농도위험지수', href: 'https://www.data.go.kr' },
    { label: '기상청 생활기상지수 3.0 (대기정체지수)', href: 'https://www.data.go.kr' },
    { label: '기상청 단기예보 · 기상특보', href: 'https://www.data.go.kr' },
    { label: '한국환경공단 에어코리아 대기오염정보', href: 'https://www.data.go.kr' },
  ],
  disclaimer:
    '본 서비스는 공공데이터를 재가공한 참고용 정보이며, 기상·대기질 공식 발표는 기상청과 에어코리아를 따릅니다.',
} as const;
