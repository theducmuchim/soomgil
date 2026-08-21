import type { NextRequest } from 'next/server';
import { DATA_MODE, KMA_APIHUB_KEY, SERVICE_KEY, TMAP_APP_KEY } from '@/lib/env';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { latestBaseDateTime } from '@/lib/api/kma-forecast';
import { kstYmdH } from '@/lib/utils/time';

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
 *   GET /api/health           설정 상태만 (호출 비용 없음)
 *   GET /api/health?probe=1   각 공공데이터 소스를 실제로 한 번씩 호출해 확인
 *
 * probe는 API 호출 한도를 소모하므로 기본으로는 하지 않는다.
 */
export const dynamic = 'force-dynamic';

interface KeyStatus {
  configured: boolean;
  length: number;
  hasWhitespace: boolean;
}

function keyStatus(value: string): KeyStatus {
  return {
    configured: value.length > 0,
    length: value.length,
    hasWhitespace: value !== value.trim(),
  };
}

/**
 * 소스 한 곳을 실제로 호출해 살아있는지 본다.
 *
 * data.go.kr 은 응답이 느리거나 SERVICETIMEOUT_ERROR 를 간헐적으로 내보낸다.
 * 한 번 실패했다고 "죽었다"고 표시하면 오진이라 한 번 더 시도한다.
 */
async function probeSource(
  name: string,
  url: string,
  attempt = 1,
): Promise<{ name: string; ok: boolean; detail: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();

    // 공공데이터포털은 HTTP 200 이어도 본문에 오류 코드를 담아 보낸다
    const errMsg = text.match(
      /(NO_OPENAPI_SERVICE_ERROR|SERVICE_KEY_IS_NOT_REGISTERED|LIMITED_NUMBER_OF_SERVICE_REQUESTS[A-Z_]*|SERVICETIMEOUT_ERROR|APPLICATION_ERROR|INVALID_REQUEST_PARAMETER_ERROR)/,
    )?.[1];
    if (errMsg) {
      // 서버 쪽 일시적 지연은 한 번 더 시도해 본다
      if (errMsg === 'SERVICETIMEOUT_ERROR' && attempt < 2) {
        return probeSource(name, url, attempt + 1);
      }
      return { name, ok: false, detail: errMsg };
    }

    if (!res.ok) return { name, ok: false, detail: `HTTP ${res.status}` };
    if (text.trim().length === 0) return { name, ok: false, detail: '빈 응답' };

    return { name, ok: true, detail: '정상' };
  } catch (error) {
    const e = error as Error;
    if (attempt < 2) return probeSource(name, url, attempt + 1);
    return {
      name,
      ok: false,
      detail: e.name === 'TimeoutError' ? '시간 초과' : e.message.slice(0, 60),
    };
  }
}

export async function GET(request: NextRequest) {
  const wantProbe = request.nextUrl.searchParams.get('probe') === '1';

  const base = {
    ok: true,
    dataMode: DATA_MODE,

    env: {
      /** data.go.kr — 에어코리아 · 꽃가루 · 생활기상지수 공용 */
      dataGoKr: keyStatus(SERVICE_KEY),
      /** apihub.kma.go.kr — 단기예보 · 초단기실황 전용 (별도 키) */
      kmaApiHub: keyStatus(KMA_APIHUB_KEY),
      /** SK Open API — 보행자 경로 · 장소검색 */
      tmap: keyStatus(TMAP_APP_KEY),
    },

    relatedEnvKeys: Object.keys(process.env)
      .filter((k) => /TMAP|DATA_GO|KMA_|SOOMGIL|DATA_MODE/i.test(k))
      .sort(),

    deployment: {
      env: process.env.VERCEL_ENV ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      region: process.env.VERCEL_REGION ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.slice(-12) ?? null,
    },

    checkedAt: new Date().toISOString(),
  };

  if (!wantProbe) {
    return Response.json(base, { headers: { 'Cache-Control': 'no-store' } });
  }

  const time = kstYmdH();
  const { base_date, base_time } = latestBaseDateTime();
  const areaNo = '3017000000'; // 대전 서구

  const sources = await Promise.all([
    probeSource(
      '에어코리아 실시간',
      `${ENDPOINTS.airRealtime}?serviceKey=${encodeURIComponent(SERVICE_KEY)}&returnType=json&numOfRows=1&pageNo=1&sidoName=${encodeURIComponent('대전')}&ver=1.3`,
    ),
    probeSource(
      '단기예보 (API허브)',
      `${ENDPOINTS.vilageFcst}?authKey=${KMA_APIHUB_KEY}&dataType=JSON&pageNo=1&numOfRows=1&base_date=${base_date}&base_time=${base_time}&nx=67&ny=100`,
    ),
    probeSource(
      '초단기실황 (API허브)',
      `${ENDPOINTS.ultraSrtNcst}?authKey=${KMA_APIHUB_KEY}&dataType=JSON&pageNo=1&numOfRows=1&base_date=${base_date}&base_time=${base_time}&nx=67&ny=100`,
    ),
    probeSource(
      '꽃가루 (참나무)',
      `${ENDPOINTS.pollen.oak}?serviceKey=${encodeURIComponent(SERVICE_KEY)}&dataType=JSON&areaNo=${areaNo}&time=${time}&pageNo=1&numOfRows=1`,
    ),
    probeSource(
      '대기정체지수',
      `${ENDPOINTS.stagnation}?serviceKey=${encodeURIComponent(SERVICE_KEY)}&dataType=JSON&areaNo=${areaNo}&time=${time}&pageNo=1&numOfRows=1`,
    ),
  ]);

  return Response.json(
    {
      ...base,
      probe: {
        live: sources.filter((s) => s.ok).map((s) => s.name),
        failing: sources.filter((s) => !s.ok).map((s) => `${s.name}: ${s.detail}`),
        // 실패한 소스는 client.ts 의 폴백이 예시 데이터로 대체한다
        note: '실패한 소스는 자동으로 예시 데이터로 대체됩니다.',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
