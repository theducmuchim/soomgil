import type { LatLng } from './geometry';
import { TMAP_APP_KEY, CACHE_TTL } from '@/lib/env';

/**
 * TMAP 보행자 경로 API.
 *
 * 한국에서 보행자 경로를 공개 API로 주는 곳은 사실상 TMAP(SK)뿐이다.
 * 공공데이터포털 API와 달리 별도 사업자(SK Open API)라 앱키를 따로 발급받는다.
 *
 *   POST https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1
 *   Header: appKey: <앱키>
 *
 * 응답은 GeoJSON FeatureCollection이고 두 종류의 feature가 섞여 온다.
 *   - Point      : 안내 지점 (출발/도착/횡단보도/좌회전 등). 첫 Point에 총거리·총시간이 있다.
 *   - LineString : 실제 도로 폴리라인 구간
 * 우리에게 필요한 건 LineString 좌표를 순서대로 이어붙인 전체 경로다.
 *
 * ⚠ 좌표 순서 주의
 * TMAP은 x=경도, y=위도 순서를 쓴다. 이 서비스 내부는 [위도, 경도] 순서이므로
 * 이 파일의 경계에서 한 번만 뒤집는다.
 */

const ENDPOINT = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1';

/**
 * 호출 제한 시간.
 *
 * 경로 화면은 서버 렌더라 TMAP이 응답하지 않으면 페이지 전체가 그만큼 멈춘다.
 * 기다리다 실패하느니 빨리 포기하고 격자 경로로 넘어가는 편이 낫다.
 */
const TIMEOUT_MS = 6000;

/** TMAP 응답에서 우리가 쓰는 부분만 */
interface TmapFeature {
  type: 'Feature';
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] };
  properties: {
    totalDistance?: number;
    totalTime?: number;
    distance?: number;
    time?: number;
    description?: string;
    name?: string;
  };
}

interface TmapResponse {
  type: 'FeatureCollection';
  features: TmapFeature[];
  error?: { id?: string; category?: string; code?: string; message?: string };
}

export interface TmapRoute {
  /** 전체 경로 좌표 [위도, 경도] 순서 */
  path: LatLng[];
  /** TMAP이 계산한 총 보행거리 (m) */
  totalDistanceM: number;
  /** TMAP이 계산한 총 소요시간 (초) — 보행 기준 */
  totalTimeSec: number;
}

export interface TmapRouteRequest {
  origin: LatLng;
  destination: LatLng;
  originName: string;
  destinationName: string;
  /** 경유지 (최대 5개). 대안 경로를 만들 때 쓴다 */
  waypoints?: LatLng[];
}

export class TmapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TmapError';
  }
}

export function isTmapConfigured(): boolean {
  return TMAP_APP_KEY.length > 0;
}

/**
 * 보행자 경로 1건을 받아온다.
 *
 * 도로망은 자주 바뀌지 않으므로 응답을 길게 캐시한다(하루).
 * 위험도는 이 경로 위에서 매번 새로 계산하므로 신선도 손해가 없다.
 */
export async function fetchPedestrianRoute(
  request: TmapRouteRequest,
): Promise<TmapRoute> {
  if (!isTmapConfigured()) {
    throw new TmapError('TMAP 앱키가 설정되지 않았습니다 (TMAP_APP_KEY)');
  }

  const { origin, destination, originName, destinationName, waypoints } = request;

  const body: Record<string, string | number> = {
    startX: origin.lng,
    startY: origin.lat,
    endX: destination.lng,
    endY: destination.lat,
    reqCoordType: 'WGS84GEO',
    resCoordType: 'WGS84GEO',
    // TMAP 문서상 지점명은 URL 인코딩된 값을 요구한다
    startName: encodeURIComponent(originName),
    endName: encodeURIComponent(destinationName),
    // 0 = 추천, 4 = 큰길 우선, 10 = 최단
    searchOption: '0',
  };

  if (waypoints && waypoints.length > 0) {
    // 'x1,y1_x2,y2' 형식. 최대 5개.
    body.passList = waypoints
      .slice(0, 5)
      .map((p) => `${p.lng},${p.lat}`)
      .join('_');
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        appKey: TMAP_APP_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: CACHE_TTL.tmapRoute },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason =
      (error as Error).name === 'TimeoutError'
        ? `${TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다`
        : (error as Error).message;
    throw new TmapError(`네트워크 오류: ${reason}`);
  }

  const text = await res.text();

  if (!res.ok) {
    // TMAP은 실패 시에도 JSON을 주지만 형식이 여러 가지라 최대한 읽어본다
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as TmapResponse;
      detail = parsed.error?.message ?? detail;
    } catch {
      // 본문이 JSON이 아니면 원문 앞부분을 그대로 쓴다
    }
    throw new TmapError(`HTTP ${res.status}: ${detail}`);
  }

  let json: TmapResponse;
  try {
    json = JSON.parse(text) as TmapResponse;
  } catch {
    throw new TmapError('응답을 JSON으로 읽지 못했습니다');
  }

  if (json.error) {
    throw new TmapError(json.error.message ?? '알 수 없는 오류');
  }

  return parseRoute(json);
}

function parseRoute(json: TmapResponse): TmapRoute {
  const features = json.features ?? [];
  if (features.length === 0) throw new TmapError('경로를 찾지 못했습니다');

  // 총거리·총시간은 첫 Point feature의 properties에 실려 온다
  const summary = features.find(
    (f) => f.properties.totalDistance !== undefined,
  )?.properties;

  const path: LatLng[] = [];
  for (const feature of features) {
    if (feature.geometry.type !== 'LineString') continue;
    for (const [lng, lat] of feature.geometry.coordinates) {
      const last = path[path.length - 1];
      // 구간 경계에서 같은 좌표가 두 번 오는 경우가 흔하다
      if (last && last.lat === lat && last.lng === lng) continue;
      path.push({ lat, lng });
    }
  }

  if (path.length < 2) throw new TmapError('경로 좌표가 비어 있습니다');

  return {
    path,
    totalDistanceM: summary?.totalDistance ?? 0,
    totalTimeSec: summary?.totalTime ?? 0,
  };
}
