import { DATA_MODE, SERVICE_KEY, TMAP_APP_KEY } from '@/lib/env';

/**
 * 배포 상태 점검.
 *
 * "로컬에서는 되는데 배포본에서는 안 된다"를 추측으로 좁히지 않기 위한 엔드포인트다.
 * 환경변수가 실제로 서버 런타임에 도달했는지, 어느 배포가 돌고 있는지를 확인한다.
 *
 * ⚠ 인증키 값 자체는 절대 내보내지 않는다.
 * 설정 여부(boolean)와 길이만 준다. 길이는 복사할 때 잘렸거나 공백이 섞인 경우를
 * 잡아내는 데 필요하다 — 값을 몰라도 "40자여야 하는데 39자"는 알 수 있다.
 *
 *   GET /api/health
 */
export const dynamic = 'force-dynamic';

export function GET() {
  /*
   * lib/env.ts 를 거친 값과 process.env 를 직접 읽은 값을 함께 본다.
   *
   * 둘 다 비어 있으면 → Vercel에 환경변수가 없거나 이 환경(Production)에 적용되지 않음
   * 직접 읽기만 값이 있으면 → 우리 모듈이 빌드 시점 값으로 굳은 것 (코드 문제)
   * 이 둘을 구분하지 못하면 대시보드만 계속 들여다보게 된다.
   */
  const direct = process.env.TMAP_APP_KEY ?? '';

  /*
   * 관련 있는 환경변수 "이름"만 나열한다. 값은 넣지 않는다.
   * 이름이 아예 없으면 대시보드에 저장이 안 된 것이고,
   * 비슷한 이름(TMAP_API_KEY 등)이 보이면 오타를 바로 찾을 수 있다.
   */
  const relatedKeys = Object.keys(process.env)
    .filter((k) => /TMAP|DATA_GO|SOOMGIL|DATA_MODE/i.test(k))
    .sort();

  return Response.json(
    {
      ok: true,
      dataMode: DATA_MODE,

      env: {
        dataGoKr: {
          configured: SERVICE_KEY.length > 0,
          length: SERVICE_KEY.length,
        },
        tmap: {
          configured: TMAP_APP_KEY.length > 0,
          length: TMAP_APP_KEY.length,
          hasWhitespace: TMAP_APP_KEY !== TMAP_APP_KEY.trim(),
        },
      },

      // 모듈을 거치지 않고 런타임에서 직접 읽은 값
      directRead: {
        tmapConfigured: direct.length > 0,
        tmapLength: direct.length,
      },

      // 이름만 (값 없음) — 오타·누락 판별용
      relatedEnvKeys: relatedKeys,

      deployment: {
        env: process.env.VERCEL_ENV ?? 'local',
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        region: process.env.VERCEL_REGION ?? null,
        // 재배포마다 바뀐다 — 새 배포가 실제로 떴는지 확인용
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.slice(-12) ?? null,
      },

      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
