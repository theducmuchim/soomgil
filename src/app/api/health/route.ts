import { DATA_MODE, SERVICE_KEY, TMAP_APP_KEY } from '@/lib/env';

/**
 * 배포 상태 점검.
 *
 * "로컬에서는 되는데 배포본에서는 안 된다"를 추측으로 좁히지 않기 위한 엔드포인트다.
 * 환경변수가 실제로 서버 런타임에 도달했는지, 어느 커밋이 돌고 있는지를 확인한다.
 *
 * ⚠ 인증키 값 자체는 절대 내보내지 않는다.
 * 설정 여부(boolean)와 길이만 준다. 길이는 복사할 때 잘렸거나 공백이 섞인 경우를
 * 잡아내는 데 필요하다 — 값을 몰라도 "40자여야 하는데 39자"는 알 수 있다.
 *
 *   GET /api/health
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    {
      ok: true,
      dataMode: DATA_MODE,

      env: {
        // 공공데이터포털 (기상청·에어코리아)
        dataGoKr: {
          configured: SERVICE_KEY.length > 0,
          length: SERVICE_KEY.length,
        },
        // TMAP (보행자 경로 + 장소검색)
        tmap: {
          configured: TMAP_APP_KEY.length > 0,
          length: TMAP_APP_KEY.length,
          // 앞뒤 공백이 섞여 들어오는 실수가 잦다
          hasWhitespace: TMAP_APP_KEY !== TMAP_APP_KEY.trim(),
        },
      },

      // Vercel이 빌드 시 주입하는 값들 — 어느 커밋이 돌고 있는지 확인용
      deployment: {
        env: process.env.VERCEL_ENV ?? 'local',
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        region: process.env.VERCEL_REGION ?? null,
      },

      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
