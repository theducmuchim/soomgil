import { TMAP_APP_KEY, CACHE_TTL } from '@/lib/env';
import { TmapError, isTmapConfigured } from './tmap';
import { findDongAt } from './geo-match';
import { DAEJEON_CENTER } from '@/data/districts';

/**
 * TMAP POI 통합검색 — 출발지·목적지 자유 검색.
 *
 *   GET https://apis.openapi.sk.com/tmap/pois?version=1
 *
 * 보행자 경로 API와 같은 앱키를 쓴다. 별도 상품 신청은 필요하지 않다.
 *
 * ⚠ 대전 밖 결과는 걸러낸다.
 * 이 서비스의 위험도 데이터는 대전 5개 자치구 안에만 존재한다. 대전 밖 좌표를
 * 출발지나 목적지로 받으면 위험도 0인 구간이 경로의 대부분을 차지해
 * 노출 점수가 의미 없는 값이 된다. 검색 단계에서 미리 막는 편이 낫다.
 */

const ENDPOINT = 'https://apis.openapi.sk.com/tmap/pois';

/** 경로 화면과 같은 이유로 짧게 끊는다 — 자동완성은 특히 빠르게 응답해야 한다 */
const TIMEOUT_MS = 4000;

/** 대전 중심 반경 (km) — 검색 결과를 이 근처로 유도한다 */
const SEARCH_RADIUS_KM = 20;

interface TmapPoi {
  id?: string;
  name?: string;
  /** 건물 입구 좌표 — 보행자 경로에는 이쪽이 더 정확하다 */
  frontLat?: string;
  frontLon?: string;
  /** 건물 중심 좌표 */
  noorLat?: string;
  noorLon?: string;
  upperAddrName?: string;
  middleAddrName?: string;
  lowerAddrName?: string;
  roadName?: string;
  firstBuildNo?: string;
  middleBizName?: string;
  lowerBizName?: string;
}

interface TmapPoiResponse {
  searchPoiInfo?: {
    totalCount?: string;
    pois?: { poi?: TmapPoi[] };
  };
  error?: { message?: string; code?: string };
}

/** 화면에 뿌릴 검색 결과 한 건 */
export interface PlaceSuggestion {
  /** 좌표를 담은 식별자 — URL 파라미터로 그대로 쓴다 */
  id: string;
  name: string;
  /** '대전 유성구 궁동' 또는 도로명 */
  address: string;
  /** '대학교', '종합병원' 같은 분류 */
  category: string;
  lat: number;
  lng: number;
  /** 이 좌표가 속한 행정동 코드 */
  dongId: string;
}

/**
 * 장소를 검색한다. 대전 안에 있는 결과만 돌려준다.
 *
 * @param query 검색어
 * @param limit 최대 결과 수
 */
export async function searchPlaces(query: string, limit = 8): Promise<PlaceSuggestion[]> {
  const keyword = query.trim();
  if (keyword.length < 2) return [];

  if (!isTmapConfigured()) {
    throw new TmapError('TMAP 앱키가 설정되지 않았습니다 (TMAP_APP_KEY)');
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set('version', '1');
  url.searchParams.set('searchKeyword', keyword);
  url.searchParams.set('searchType', 'all');
  url.searchParams.set('resCoordType', 'WGS84GEO');
  url.searchParams.set('reqCoordType', 'WGS84GEO');
  // 대전 근처 결과가 위로 오도록 중심점을 준다
  url.searchParams.set('centerLat', String(DAEJEON_CENTER[0]));
  url.searchParams.set('centerLon', String(DAEJEON_CENTER[1]));
  url.searchParams.set('radius', String(SEARCH_RADIUS_KM));
  // 대전 밖 결과를 걸러내면 개수가 줄어드니 넉넉히 받는다
  url.searchParams.set('count', String(Math.min(limit * 4, 30)));
  url.searchParams.set('appKey', TMAP_APP_KEY);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: CACHE_TTL.tmapPoi },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason =
      (error as Error).name === 'TimeoutError'
        ? `${TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다`
        : (error as Error).message;
    throw new TmapError(`장소 검색 실패: ${reason}`);
  }

  /*
   * TMAP은 검색 결과가 하나도 없으면 200이 아니라 **204 No Content**에 빈 본문을 준다.
   * 이걸 에러로 처리하면 "검색 실패"라고 잘못 안내하게 된다.
   * 결과 없음은 정상적인 응답이므로 빈 배열로 돌려준다.
   */
  if (res.status === 204) return [];

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 160);
    try {
      detail = (JSON.parse(text) as TmapPoiResponse).error?.message ?? detail;
    } catch {
      // JSON이 아니면 원문 앞부분을 쓴다
    }
    throw new TmapError(`장소 검색 HTTP ${res.status}: ${detail}`);
  }

  // 200인데 본문이 비어 있는 경우도 있다 — 마찬가지로 결과 없음으로 본다
  if (text.trim().length === 0) return [];

  let json: TmapPoiResponse;
  try {
    json = JSON.parse(text) as TmapPoiResponse;
  } catch {
    throw new TmapError('장소 검색 응답을 읽지 못했습니다');
  }

  const pois = json.searchPoiInfo?.pois?.poi ?? [];
  const out: PlaceSuggestion[] = [];

  for (const poi of pois) {
    // 건물 입구 좌표를 우선 쓴다. 없으면 건물 중심.
    const lat = Number(poi.frontLat || poi.noorLat);
    const lng = Number(poi.frontLon || poi.noorLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    // 대전 행정동 안에 있는 결과만 통과시킨다
    const dongId = findDongAt(lat, lng);
    if (!dongId) continue;

    out.push({
      id: encodePlaceId(lat, lng, poi.name ?? '이름 없음'),
      name: poi.name ?? '이름 없음',
      address: formatAddress(poi),
      category: poi.lowerBizName || poi.middleBizName || '',
      lat,
      lng,
      dongId,
    });

    if (out.length >= limit) break;
  }

  return out;
}

/**
 * 좌표를 URL 파라미터에 담을 문자열로 만든다.
 *
 * 미리 정의된 장소는 'cnu' 같은 id를 쓰지만, 자유 검색 결과는 목록에 없으므로
 * 좌표와 이름을 그대로 담는다. 이렇게 해야 검색한 경로도 링크로 공유된다.
 *
 *   'ㄱ36.3665,127.3450,충남대학교'  →  'p:36.3665,127.345,충남대학교'
 */
export function encodePlaceId(lat: number, lng: number, name: string): string {
  return `p:${round5(lat)},${round5(lng)},${name}`;
}

export interface DecodedPlace {
  lat: number;
  lng: number;
  name: string;
}

/** encodePlaceId의 역방향. 형식이 아니면 null */
export function decodePlaceId(value: string): DecodedPlace | null {
  if (!value.startsWith('p:')) return null;

  const body = value.slice(2);
  const first = body.indexOf(',');
  const second = body.indexOf(',', first + 1);
  if (first < 0 || second < 0) return null;

  const lat = Number(body.slice(0, first));
  const lng = Number(body.slice(first + 1, second));
  const name = body.slice(second + 1);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) return null;
  return { lat, lng, name };
}

function formatAddress(poi: TmapPoi): string {
  const parts = [poi.upperAddrName, poi.middleAddrName, poi.lowerAddrName].filter(
    Boolean,
  );
  const road =
    poi.roadName && poi.firstBuildNo ? `${poi.roadName} ${poi.firstBuildNo}` : poi.roadName;

  return [parts.join(' '), road].filter(Boolean).join(' · ');
}

function round5(v: number): number {
  return Math.round(v * 1e5) / 1e5;
}
