import type { Scenario } from './types';

/**
 * 봄 — 참나무·소나무 꽃가루가 절정인 날에 황사가 겹친 상황.
 *
 * 값 근거
 *  - 꽃가루지수: 산에 접한 유성구·동구가 3(매우높음), 도심부가 2(높음)
 *  - PM10 140~175µg/m³ : 황사 유입 시 대전에서 흔히 관측되는 범위
 *  - PM2.5는 PM10에 비해 덜 오름 (황사는 상대적으로 굵은 입자)
 *  - 4월 오전 10시 기온 18~20℃, 서~북서풍 — 체감온도는 위험 지표가 아님
 */
export const SPRING_SCENARIO: Scenario = {
  season: 'spring',
  label: '봄 — 꽃가루 절정 + 황사 유입',
  situation: '참나무 꽃가루가 매우높음인 날 오전에 황사가 함께 들어온 상황',
  baseTime: '2026-04-16T10:00:00+09:00',
  stagnation: 62,
  warnings: [{ title: '대전, 세종, 충남 황사 위기경보 주의', tmFc: '202604160600' }],
  districts: {
    dong: {
      oakPollen: 3, pinePollen: 3,
      pm10: 172, pm25: 58, ozone: 0.052,
      tempC: 18.6, humidity: 42, windMs: 2.4, windDeg: 290,
    },
    jung: {
      oakPollen: 2, pinePollen: 2,
      pm10: 158, pm25: 54, ozone: 0.049,
      tempC: 19.2, humidity: 40, windMs: 2.1, windDeg: 285,
    },
    seo: {
      oakPollen: 2, pinePollen: 2,
      pm10: 149, pm25: 51, ozone: 0.047,
      tempC: 19.5, humidity: 39, windMs: 2.8, windDeg: 280,
    },
    yuseong: {
      oakPollen: 3, pinePollen: 3,
      pm10: 141, pm25: 48, ozone: 0.045,
      tempC: 18.9, humidity: 44, windMs: 3.1, windDeg: 295,
    },
    daedeok: {
      oakPollen: 2, pinePollen: 3,
      pm10: 165, pm25: 56, ozone: 0.051,
      tempC: 18.4, humidity: 43, windMs: 2.6, windDeg: 300,
    },
  },
  // 꽃가루는 오전 6~11시에 가장 많이 날린다
  hourlyProfile: [
    0.72, 0.7, 0.7, 0.74, 0.82, 0.94, 1.08, 1.18, 1.24, 1.26, 1.22, 1.14,
    1.05, 0.98, 0.94, 0.92, 0.93, 0.96, 0.98, 0.95, 0.9, 0.84, 0.79, 0.75,
  ],
};
