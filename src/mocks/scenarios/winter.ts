import type { Scenario } from './types';

/**
 * 겨울 — 대기정체로 미세먼지가 쌓인 상태에서 한파까지 겹친 출근 시간.
 *
 * 값 근거
 *  - PM10 95~145 / PM2.5 48~78 : 겨울 정체 시 대전의 '나쁨~매우나쁨' 구간
 *  - 대기정체지수 88 : 분지에 갇혀 빠져나가지 못하는 전형적 겨울 상황
 *  - 기온 -7~-9℃에 북서풍 3.5~5.0m/s → 체감온도는 -13℃ 안팎(한파주의보 수준)
 *  - PM10이 150 아래라 '황사'로는 잡히지 않는다. 국내 정체성 미세먼지 상황.
 */
export const WINTER_SCENARIO: Scenario = {
  season: 'winter',
  label: '겨울 — 미세먼지 매우나쁨 + 한파',
  situation: '대기정체로 초미세먼지가 쌓인 상태에서 한파주의보가 겹친 출근 시간',
  baseTime: '2026-01-14T08:00:00+09:00',
  stagnation: 88,
  warnings: [
    { title: '대전, 세종, 충남 한파주의보', tmFc: '202601140500' },
    { title: '대전 초미세먼지 주의보', tmFc: '202601140700' },
  ],
  districts: {
    dong: {
      pm10: 128, pm25: 68, ozone: 0.014,
      tempC: -8.2, humidity: 48, windMs: 4.1, windDeg: 320,
    },
    jung: {
      pm10: 136, pm25: 72, ozone: 0.013,
      tempC: -7.8, humidity: 50, windMs: 3.6, windDeg: 315,
    },
    seo: {
      pm10: 119, pm25: 61, ozone: 0.015,
      tempC: -7.5, humidity: 47, windMs: 4.4, windDeg: 310,
    },
    yuseong: {
      pm10: 98, pm25: 49, ozone: 0.018,
      tempC: -8.9, humidity: 45, windMs: 5.0, windDeg: 325,
    },
    daedeok: {
      pm10: 145, pm25: 78, ozone: 0.012,
      tempC: -8.6, humidity: 51, windMs: 3.8, windDeg: 330,
    },
  },
  // 난방·교통 배출이 겹치는 아침 7~9시와 저녁 19~21시에 두 번 정점
  hourlyProfile: [
    0.88, 0.84, 0.82, 0.84, 0.92, 1.04, 1.18, 1.28, 1.26, 1.14, 1.02, 0.94,
    0.88, 0.84, 0.82, 0.84, 0.92, 1.06, 1.18, 1.24, 1.2, 1.1, 1.0, 0.93,
  ],
};
