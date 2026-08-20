import type { Scenario } from './types';

/**
 * 여름 — 폭염경보가 발효된 오후 3시, 오존까지 나쁨으로 오른 상황.
 *
 * 값 근거
 *  - 낮 최고기온 35~37℃ : 대전 폭염경보 발효 시 실제 관측 범위
 *  - 오존 0.098~0.138ppm : 햇빛 강한 여름 오후에 광화학 반응으로 치솟는 구간(나쁨)
 *  - 풍속 1.2~2.0m/s : 바람이 거의 없어 열과 오존이 빠지지 않는 전형적 폭염일
 *  - 미세먼지는 여름 강수·확산으로 낮음~보통
 *  - 8월은 소나무·참나무(3~6월) 기간은 지났지만 잡초류(8~10월) 기간이 막 시작된다.
 *    돼지풀은 8월 중순부터 본격화하므로 8월 초는 낮음~보통 수준으로 둔다.
 */
export const SUMMER_SCENARIO: Scenario = {
  season: 'summer',
  label: '여름 — 폭염경보 + 오존 나쁨',
  situation: '체감온도 35℃를 넘긴 오후에 오존 농도까지 나쁨으로 오른 상황',
  baseTime: '2026-08-06T15:00:00+09:00',
  stagnation: 78,
  warnings: [{ title: '대전, 세종 폭염경보', tmFc: '202608060900' }],
  districts: {
    dong: {
      weedPollen: 1,
      pm10: 42, pm25: 24, ozone: 0.128,
      tempC: 36.4, humidity: 56, windMs: 1.3, windDeg: 215,
    },
    jung: {
      weedPollen: 1,
      pm10: 45, pm25: 26, ozone: 0.121,
      tempC: 36.9, humidity: 54, windMs: 1.2, windDeg: 220,
    },
    seo: {
      weedPollen: 1,
      pm10: 38, pm25: 21, ozone: 0.112,
      tempC: 35.8, humidity: 58, windMs: 1.8, windDeg: 225,
    },
    yuseong: {
      weedPollen: 1,
      pm10: 33, pm25: 18, ozone: 0.098,
      tempC: 35.1, humidity: 61, windMs: 2.2, windDeg: 230,
    },
    daedeok: {
      weedPollen: 1,
      pm10: 47, pm25: 27, ozone: 0.138,
      tempC: 36.6, humidity: 55, windMs: 1.4, windDeg: 210,
    },
  },
  // 오존·체감온도 모두 14~16시에 정점
  hourlyProfile: [
    0.52, 0.48, 0.46, 0.45, 0.46, 0.52, 0.6, 0.68, 0.76, 0.85, 0.94, 1.04,
    1.12, 1.2, 1.26, 1.28, 1.24, 1.14, 1.0, 0.86, 0.75, 0.68, 0.62, 0.56,
  ],
};
