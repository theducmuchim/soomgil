import type { NextRequest } from 'next/server';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason } from '@/lib/risk/season';

/**
 * 통합 위험 스냅샷.
 *
 * 공공데이터 인증키는 서버에만 두고, 브라우저는 이 라우트만 호출한다.
 * (공공데이터 API 대부분이 CORS를 막아둬서 브라우저 직접 호출은 어차피 불가능하다)
 *
 *   GET /api/risk            현재 계절
 *   GET /api/risk?season=winter   시연용 계절 강제 (mock 모드에서만 반영)
 */
export async function GET(request: NextRequest) {
  const season = parseSeason(request.nextUrl.searchParams.get('season'));
  const snapshot = await getRiskSnapshot({ seasonOverride: season });

  return Response.json(snapshot, {
    headers: {
      // 브라우저·CDN 캐시. 서버 쪽 캐시는 lib/env.ts 의 CACHE_TTL이 따로 관리한다.
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  });
}
