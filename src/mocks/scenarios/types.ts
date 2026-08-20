import type { DistrictId, Season } from '@/types';

/**
 * 시연용 시나리오.
 *
 * 여기 적힌 값은 "정규화된 도메인 값"이 아니라 각 API가 실제로 뱉는 원단위 값이다.
 * mocks/raw/*.ts 가 이 값을 받아 공공데이터 API 응답 형태로 감싸고,
 * lib/normalize/*.ts 가 그걸 다시 풀어낸다.
 * 즉 mock도 실제 API와 완전히 같은 경로를 지나가므로,
 * live 전환 시 파싱 코드가 처음 돌아가는 상황이 생기지 않는다.
 */
export interface ScenarioDistrictValues {
  /** 꽃가루농도위험지수 0~3 (서비스 기간이 아니면 생략) */
  pinePollen?: number;
  oakPollen?: number;
  weedPollen?: number;
  /** 미세먼지 µg/m³ */
  pm10: number;
  /** 초미세먼지 µg/m³ */
  pm25: number;
  /** 오존 ppm */
  ozone: number;
  /** 단기예보 TMP — 기온 ℃ */
  tempC: number;
  /** 단기예보 REH — 상대습도 % */
  humidity: number;
  /** 단기예보 WSD — 풍속 m/s */
  windMs: number;
  /** 단기예보 VEC — 풍향 (도, 바람이 불어오는 방향) */
  windDeg: number;
}

export interface ScenarioWarning {
  /** 기상특보 제목 원문 — normalize에서 파싱한다 */
  title: string;
  /** 발표시각 tmFc (YYYYMMDDHHmm) */
  tmFc: string;
}

export interface Scenario {
  season: Season;
  /** 시연 메뉴에 뜨는 이름 */
  label: string;
  /** 한 줄 상황 설명 */
  situation: string;
  /** 이 스냅샷의 기준 시각 (KST, ISO 8601) */
  baseTime: string;
  /** 대기정체지수 0~100 — 대전 전역 공통 */
  stagnation: number;
  warnings: ScenarioWarning[];
  districts: Record<DistrictId, ScenarioDistrictValues>;
  /**
   * 0~23시 시간대별 배수. 시 전체 대표 지표에 곱해 추이 그래프를 만든다.
   * (8단계 통계 화면에서 사용)
   */
  hourlyProfile: number[];
}
