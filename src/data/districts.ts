import type { District, DistrictId } from '@/types';

/**
 * 대전광역시 5개 자치구.
 *
 * areaNo : 기상청 생활기상지수/꽃가루지수 API의 행정구역코드(10자리)
 * grid   : 기상청 단기예보 API의 격자 좌표 (nx, ny)
 * center : 지도 라벨 표시용 대략 중심 좌표 [위도, 경도]
 *
 * TODO(live): API 키 발급 후 반드시 아래 2가지를 기술문서의 지역코드표와 대조할 것.
 *
 *  1) areaNo — 생활기상지수/꽃가루지수 API의 행정구역코드표와 5개 구 전부 대조.
 *  2) grid   — 단기예보 격자와 대조. 격자가 예상과 다르게 나오면
 *              "코드가 틀렸다"고 판단하기 전에 **인접 구가 같은 격자로 묶였을 가능성부터**
 *              확인할 것. 단기예보 격자는 약 5km 간격인데 대전은 시 전체가 25km 남짓이라
 *              동구·중구·대덕구처럼 붙어 있는 구가 같은 (nx, ny)를 공유하는 게 정상이다.
 *              이 경우 구별 예보값이 동일하게 나오는 것도 오류가 아니다.
 *              구 단위 해상도가 더 필요하면 격자를 쪼개는 대신
 *              에어코리아 측정소별 실시간 데이터로 보간하는 쪽이 맞다.
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
