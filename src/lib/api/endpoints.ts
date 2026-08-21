/**
 * 공공데이터포털 엔드포인트.
 *
 * ⚠ TODO(live): 꽃가루·생활기상지수 경로가 아직 확인되지 않았다.
 *
 * 아래 두 상수는 추정치이고, 실제로 부르면 오퍼레이션 이름과 무관하게
 * NO_OPENAPI_SERVICE_ERROR(코드 12, "해당 오픈API 서비스가 없거나 폐기됨")가 돌아온다.
 * 같은 키로 에어코리아는 정상 동작하고, 단기예보는 SERVICE_KEY_IS_NOT_REGISTERED 라는
 * **다른** 에러가 나온다. 즉 키 문제가 아니라 경로가 존재하지 않는다는 뜻이다.
 *
 * 정확한 주소를 얻는 방법
 *   data.go.kr 해당 서비스 상세 페이지 → [참고문서] 의 "오픈API 활용가이드" 내려받기
 *   → 문서의 "요청주소(Call Back URL)" 항목을 그대로 옮겨 적을 것.
 *   활용가이드는 로그인해야 받을 수 있어 코드에서 자동으로 확인할 수 없다.
 *
 * 경로가 확정될 때까지 이 두 소스는 자동으로 예시 데이터로 대체된다
 * (client.ts 의 폴백). 나머지 소스는 실데이터로 동작한다.
 */

/*
 * 실제 키로 확인한 결과 (2026-08-21)
 *
 *  ✅ 에어코리아 실시간           data.go.kr    정상
 *  ✅ 단기예보 · 초단기실황       API허브        정상
 *  ❌ 꽃가루 · 생활기상지수       경로 미확인 — 아래 주석 참조
 *  ❌ 기상특보                    키 미신청 (SERVICE_KEY_IS_NOT_REGISTERED)
 *
 * 단기예보를 data.go.kr 쪽으로 부르면 SERVICE_KEY_IS_NOT_REGISTERED 가 나온다.
 * 즉 이 서비스는 API허브 전용이고 인증 파라미터도 authKey 다.
 */
const KMA_HEALTH = 'https://apis.data.go.kr/1360000/HealthWthrIdxServiceV4';
const KMA_LIVING = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4';
/** 기상청 API허브 — data.go.kr 과 호스트·인증 파라미터가 모두 다르다 */
const KMA_HUB = 'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0';
const KMA_WARN = 'https://apis.data.go.kr/1360000/WthrWrnInfoService';
const AIRKOREA = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc';

export const ENDPOINTS = {
  pollen: {
    pine: `${KMA_HEALTH}/getPinePollenRiskndex`,
    oak: `${KMA_HEALTH}/getOakPollenRiskndex`,
    weed: `${KMA_HEALTH}/getWeedsPollenRiskndex`,
  },
  stagnation: `${KMA_LIVING}/getAirStagnationIdx`,
  /** 단기예보 (API허브) */
  vilageFcst: `${KMA_HUB}/getVilageFcst`,
  /** 초단기실황 (API허브) — 현재 관측값 */
  ultraSrtNcst: `${KMA_HUB}/getUltraSrtNcst`,
  warning: `${KMA_WARN}/getWthrWrnList`,
  airRealtime: `${AIRKOREA}/getCtprvnRltmMesureDnsty`,
  airForecast: `${AIRKOREA}/getMinuDustFrcstDspth`,
} as const;
