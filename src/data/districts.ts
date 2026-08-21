import type { District, DistrictId } from '@/types';

/**
 * 대전광역시 5개 자치구.
 *
 * areaNo : 기상청 생활기상지수/꽃가루지수 API의 행정구역코드(10자리)
 * grid   : 기상청 단기예보 API의 격자 좌표 (nx, ny)
 * center : 지도 라벨 표시용 대략 중심 좌표 [위도, 경도]
 *
 * areaNo 는 실제 API 호출로 5개 구 모두 검증했다 (2026-08-21).
 * 생활기상지수 V5 에 각 코드를 넣으면 resultCode 00 과 함께 같은 areaNo 를 돌려준다.
 *
 * grid 는 단기예보 격자다. 인접한 구가 같은 (nx, ny) 를 공유하는 것은 정상이다 —
 * 격자가 약 5km 간격인데 대전은 시 전체가 25km 남짓이라 그렇다.
 * 구 단위 해상도가 필요한 미세먼지·오존은 격자가 아니라
 * 에어코리아 측정소별 실측으로 낸다 (data/stations.ts).
 */
export const DISTRICTS: District[] = [
  {
    id: 'dong',
    name: '동구',
    areaNo: '3011000000',
    grid: { nx: 68, ny: 100 },
    center: [36.3117, 127.4548],
  },
  {
    id: 'jung',
    name: '중구',
    areaNo: '3014000000',
    grid: { nx: 68, ny: 100 },
    center: [36.3255, 127.4214],
  },
  {
    id: 'seo',
    name: '서구',
    areaNo: '3017000000',
    grid: { nx: 67, ny: 100 },
    center: [36.3555, 127.3839],
  },
  {
    id: 'yuseong',
    name: '유성구',
    areaNo: '3020000000',
    grid: { nx: 67, ny: 101 },
    center: [36.3622, 127.3562],
  },
  {
    id: 'daedeok',
    name: '대덕구',
    areaNo: '3023000000',
    grid: { nx: 68, ny: 101 },
    center: [36.3466, 127.4157],
  },
];

/** 대전 전역 대표 격자 (시 단위 조회용) */
export const DAEJEON_GRID = { nx: 67, ny: 100 };

/** 지도 초기 뷰 */
export const DAEJEON_CENTER: [number, number] = [36.3504, 127.3845];
export const DAEJEON_ZOOM = 11;

export const DISTRICT_BY_ID = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d]),
) as Record<DistrictId, District>;
