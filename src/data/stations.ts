import type { DistrictId } from '@/types';

/**
 * 에어코리아 도시대기 측정소 ↔ 자치구 매핑.
 *
 * 단기예보 격자(약 5km)로는 대전처럼 좁은 지역에서 구별 차이가 거의 안 나온다.
 * 미세먼지·오존의 구 단위 해상도는 격자가 아니라 이 측정소별 실시간 데이터로 낸다.
 *
 * TODO(live): 에어코리아 '측정소 정보 조회 서비스'로 대전 측정소 목록을 받아
 *             아래 이름이 현재도 운영 중인지 확인할 것. 측정소는 신설·폐지가 있다.
 */
export const STATIONS: Record<DistrictId, string[]> = {
  dong: ['성남동1가', '대성동'],
  jung: ['문화동', '대흥동1'],
  seo: ['둔산동', '정림동'],
  yuseong: ['노은동', '구성동'],
  daedeok: ['읍내동', '관평동'],
};

/** 측정소명 → 자치구 (역방향 조회) */
export const DISTRICT_BY_STATION: Record<string, DistrictId> = Object.fromEntries(
  Object.entries(STATIONS).flatMap(([districtId, names]) =>
    names.map((name) => [name, districtId as DistrictId]),
  ),
);
