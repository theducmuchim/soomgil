/**
 * 공공데이터포털 엔드포인트.
 *
 * ⚠ TODO(live): 아래 오퍼레이션명은 각 서비스 신청 후 받는 기술문서로 반드시 대조할 것.
 * 공공데이터포털은 같은 서비스라도 버전이 올라가면 경로(…ServiceV4 등)와
 * 오퍼레이션명이 함께 바뀐다. 지금 값은 신청 화면 기준의 추정치다.
 *
 * 대조가 필요한 순서
 *   1) 기상청 꽃가루농도위험지수 — 소나무/참나무/잡초 각각의 오퍼레이션명
 *   2) 기상청 생활기상지수 3.0 — 대기정체지수 오퍼레이션명
 *   3) 기상청 기상특보 — getWthrWrnList 응답 필드
 *   4) 에어코리아 — ver 파라미터 값(현재 1.3)
 */

const KMA_HEALTH = 'https://apis.data.go.kr/1360000/HealthWthrIdxServiceV4';
const KMA_LIVING = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4';
const KMA_FCST = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const KMA_WARN = 'https://apis.data.go.kr/1360000/WthrWrnInfoService';
const AIRKOREA = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc';

export const ENDPOINTS = {
  pollen: {
    pine: `${KMA_HEALTH}/getPinePollenRiskndex`,
    oak: `${KMA_HEALTH}/getOakPollenRiskndex`,
    weed: `${KMA_HEALTH}/getWeedsPollenRiskndex`,
  },
  stagnation: `${KMA_LIVING}/getAirStagnationIdx`,
  vilageFcst: `${KMA_FCST}/getVilageFcst`,
  warning: `${KMA_WARN}/getWthrWrnList`,
  airRealtime: `${AIRKOREA}/getCtprvnRltmMesureDnsty`,
  airForecast: `${AIRKOREA}/getMinuDustFrcstDspth`,
} as const;
