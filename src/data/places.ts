import type { DistrictId } from '@/types';

/**
 * 출발지·목적지 후보 지점.
 *
 * 실서비스라면 카카오·네이버 장소검색 API를 붙이지만, 프로토타입에서는
 * 대전 사람이라면 아는 주요 지점을 목록으로 둔다.
 * 시연할 때 주소를 타이핑하다 오타가 나는 상황을 피하려는 목적도 있다.
 */
export interface Place {
  id: string;
  name: string;
  /** 검색용 별칭 */
  aliases?: string[];
  districtId: DistrictId;
  coord: [number, number]; // [위도, 경도]
  /** '검색'은 자유 검색으로 들어온 장소 — 미리 정의된 목록에는 없다 */
  category: '교통' | '학교' | '병원' | '공공' | '상업' | '공원' | '검색';
}

export const PLACES: Place[] = [
  // 교통 거점
  { id: 'daejeon-station', name: '대전역', districtId: 'dong', coord: [36.3320, 127.4343], category: '교통' },
  { id: 'seodaejeon-station', name: '서대전역', districtId: 'jung', coord: [36.3221, 127.4025], category: '교통' },
  { id: 'daejeon-terminal', name: '대전복합터미널', aliases: ['동부터미널'], districtId: 'dong', coord: [36.3510, 127.4363], category: '교통' },
  { id: 'yuseong-express', name: '유성고속버스터미널', districtId: 'yuseong', coord: [36.3542, 127.3418], category: '교통' },
  { id: 'sintanjin-station', name: '신탄진역', districtId: 'daedeok', coord: [36.4402, 127.4306], category: '교통' },

  // 학교
  { id: 'cnu', name: '충남대학교', aliases: ['충대'], districtId: 'yuseong', coord: [36.3665, 127.3450], category: '학교' },
  { id: 'kaist', name: 'KAIST', aliases: ['카이스트', '한국과학기술원'], districtId: 'yuseong', coord: [36.3721, 127.3604], category: '학교' },
  { id: 'hannam', name: '한남대학교', districtId: 'daedeok', coord: [36.3541, 127.4194], category: '학교' },
  { id: 'daejeon-univ', name: '대전대학교', districtId: 'dong', coord: [36.3277, 127.4560], category: '학교' },
  { id: 'mokwon', name: '목원대학교', districtId: 'seo', coord: [36.3086, 127.3391], category: '학교' },

  // 병원
  { id: 'cnuh', name: '충남대학교병원', aliases: ['충대병원'], districtId: 'jung', coord: [36.3178, 127.4162], category: '병원' },
  { id: 'eulji', name: '을지대학교병원', districtId: 'seo', coord: [36.3559, 127.3897], category: '병원' },
  { id: 'sun-hospital', name: '선병원', districtId: 'jung', coord: [36.3283, 127.4212], category: '병원' },

  // 공공
  { id: 'city-hall', name: '대전시청', districtId: 'seo', coord: [36.3504, 127.3845], category: '공공' },
  { id: 'government-complex', name: '정부대전청사', districtId: 'seo', coord: [36.3608, 127.3846], category: '공공' },
  { id: 'daedeok-innopolis', name: '대덕연구단지', aliases: ['대덕특구'], districtId: 'yuseong', coord: [36.3900, 127.3650], category: '공공' },

  // 상업
  { id: 'dunsan', name: '둔산동 상권', aliases: ['둔산'], districtId: 'seo', coord: [36.3515, 127.3785], category: '상업' },
  { id: 'eunhaeng', name: '은행동 으능정이', aliases: ['으능정이', '중앙로'], districtId: 'jung', coord: [36.3283, 127.4275], category: '상업' },
  { id: 'yuseong-oncheon', name: '유성온천역 상권', districtId: 'yuseong', coord: [36.3543, 127.3413], category: '상업' },

  // 공원 — 꽃가루 시나리오에서 의미가 큰 지점
  { id: 'hanbat-arboretum', name: '한밭수목원', districtId: 'seo', coord: [36.3676, 127.3880], category: '공원' },
  { id: 'bomunsan', name: '보문산공원', districtId: 'jung', coord: [36.3010, 127.4176], category: '공원' },
  { id: 'gyejoksan', name: '계족산 황톳길', aliases: ['계족산'], districtId: 'daedeok', coord: [36.3833, 127.4380], category: '공원' },
  { id: 'expo-park', name: '엑스포과학공원', districtId: 'yuseong', coord: [36.3752, 127.3894], category: '공원' },
  { id: 'daecheong-dam', name: '대청호 벚꽃길', aliases: ['대청호'], districtId: 'dong', coord: [36.4780, 127.4830], category: '공원' },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

/** 드롭다운 그룹에 쓰는 카테고리 (자유 검색 장소는 제외) */
export const PRESET_CATEGORIES = [
  '교통',
  '학교',
  '병원',
  '공공',
  '상업',
  '공원',
] as const;

/** 이름·별칭으로 검색 */
export function searchPlaces(query: string, limit = 6): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return PLACES.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    return p.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false;
  }).slice(0, limit);
}
