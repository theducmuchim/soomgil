import type { NextRequest } from 'next/server';
import { searchPlaces } from '@/lib/routing/tmap-poi';
import { isTmapConfigured } from '@/lib/routing/tmap';

/**
 * 장소 검색 프록시.
 *
 * TMAP 앱키를 브라우저에 내보내지 않기 위해 서버를 한 번 거친다.
 * 앱키가 노출되면 다른 사이트에서 우리 호출 한도를 소진시킬 수 있다.
 *
 *   GET /api/places/search?q=충남대
 *
 * 실패해도 500을 던지지 않는다. 자동완성은 실패했다고 화면을 막을 이유가 없고,
 * 클라이언트는 결과가 비면 미리 정의된 장소 목록으로 대체한다.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return Response.json({ places: [], reason: 'too-short' as const });
  }

  if (!isTmapConfigured()) {
    return Response.json({ places: [], reason: 'not-configured' as const });
  }

  try {
    const places = await searchPlaces(query);
    return Response.json(
      { places, reason: places.length === 0 ? ('no-results' as const) : null },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    console.warn('[soomgil] 장소 검색 실패 — 기본 목록으로 대체합니다.', error);
    return Response.json({ places: [], reason: 'error' as const });
  }
}
