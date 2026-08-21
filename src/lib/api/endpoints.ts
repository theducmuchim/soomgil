/**
 * 공공데이터포털 엔드포인트.
 *
 * 모든 주소는 실제 호출로 확인했다 (2026-08-21).
 * 버전 표기에 주의할 것 — 꽃가루는 V3, 생활기상지수는 V5 다.
 * 서비스마다 버전이 따로 올라가서 한쪽에 맞추면 다른 쪽이 깨진다.
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
const KMA_HEALTH = 'https://apis.data.go.kr/1360000/HealthWthrIdxServiceV3';
const KMA_LIVING = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV5';
/** 기상청 API허브 — data.go.kr 과 호스트·인증 파라미터가 모두 다르다 */
const KMA_HUB = 'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0';
const KMA_WARN = 'https://apis.data.go.kr/1360000/WthrWrnInfoService';
const AIRKOREA = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc';

export const ENDPOINTS = {
  /*
   * 꽃가루농도위험지수 (V3).
   * 오퍼레이션 이름의 표기가 종류마다 다르다 — 소나무·참나무는 RiskIdx,
   * 잡초류만 Riskndx 다. 오타처럼 보이지만 실제 문서가 그렇게 되어 있어
   * 그대로 맞춰야 호출된다.
   */
  pollen: {
    pine: `${KMA_HEALTH}/getPinePollenRiskIdxV3`,
    oak: `${KMA_HEALTH}/getOakPollenRiskIdxV3`,
    weed: `${KMA_HEALTH}/getWeedsPollenRiskndxV3`,
  },
  /*
   * ⚠ 대기"확산"지수다. 정체지수가 아니다.
   *
   * 값이 클수록 대기가 잘 확산된다 = 오염물질이 덜 쌓인다 = 안전하다.
   * 이 서비스의 stagnation 지표는 반대 방향(클수록 위험)이므로
   * normalize 단계에서 뒤집는다. lib/normalize/kma.ts 참조.
   */
  stagnation: `${KMA_LIVING}/getAirDiffusionIdxV5`,
  /** 단기예보 (API허브) */
  vilageFcst: `${KMA_HUB}/getVilageFcst`,
  /** 초단기실황 (API허브) — 현재 관측값 */
  ultraSrtNcst: `${KMA_HUB}/getUltraSrtNcst`,
  warning: `${KMA_WARN}/getWthrWrnList`,
  airRealtime: `${AIRKOREA}/getCtprvnRltmMesureDnsty`,
  airForecast: `${AIRKOREA}/getMinuDustFrcstDspth`,
} as const;
