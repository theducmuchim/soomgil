import type { Scenario } from './types';

/**
 * 가을 — 잡초류(돼지풀) 꽃가루와 미세먼지가 함께 오른 아침.
 *
 * 값 근거
 *  - 잡초류 꽃가루지수: 하천변·유휴지가 많은 유성구·대덕구가 3, 도심부가 2
 *  - PM10 62~92 / PM2.5 34~48 : 가을 대기정체기에 흔한 '보통~나쁨' 구간
 *  - 오존은 일사량이 줄어 낮음
 *  - 9월이라 소나무·참나무는 서비스 기간(3~6월) 밖, 잡초류(8~10월)만 유효
 */
export const AUTUMN_SCENARIO: Scenario = {
  season: 'autumn',
  label: '가을 — 잡초 꽃가루 + 미세먼지',
  situation: '돼지풀 꽃가루가 매우높음인 아침에 미세먼지가 나쁨까지 오른 상황',
  baseTime: '2026-09-24T09:00:00+09:00',
  stagnation: 71,
  warnings: [],
  districts: {
    dong: {
      weedPollen: 2,
      pm10: 78, pm25: 42, ozone: 0.036,
      tempC: 20.8, humidity: 68, windMs: 1.9, windDeg: 45,
    },
    jung: {
      weedPollen: 2,
      pm10: 84, pm25: 45, ozone: 0.034,
      tempC: 21.2, humidity: 66, windMs: 1.8, windDeg: 40,
    },
    seo: {
      weedPollen: 2,
      pm10: 71, pm25: 38, ozone: 0.038,
      tempC: 21.5, humidity: 64, windMs: 2.3, windDeg: 35,
    },
    yuseong: {
      weedPollen: 3,
      pm10: 66, pm25: 35, ozone: 0.041,
      tempC: 20.4, humidity: 71, windMs: 2.6, windDeg: 30,
    },
    daedeok: {
      weedPollen: 3,
      pm10: 92, pm25: 48, ozone: 0.033,
      tempC: 20.1, humidity: 72, windMs: 1.7, windDeg: 50,
    },
  },
  // 잡초 꽃가루는 아침 7~10시에 정점, 미세먼지는 출퇴근 시간에 한 번 더
  hourlyProfile: [
    0.78, 0.76, 0.75, 0.78, 0.86, 0.98, 1.12, 1.24, 1.28, 1.22, 1.1, 1.0,
    0.94, 0.9, 0.88, 0.9, 0.96, 1.06, 1.08, 1.0, 0.94, 0.88, 0.84, 0.8,
  ],
};
