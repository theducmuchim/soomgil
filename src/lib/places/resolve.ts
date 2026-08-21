import type { Place } from '@/data/places';
import { PLACE_BY_ID } from '@/data/places';
import { decodePlaceId } from '@/lib/routing/tmap-poi';
import { findDistrictAt } from '@/lib/routing/geo-match';

/**
 * URL 파라미터 → 장소.
 *
 * 두 가지 형식을 모두 받는다.
 *   'cnu'                              미리 정의된 장소 id (기존 링크가 계속 동작한다)
 *   'p:36.3665,127.345,충남대학교'      자유 검색으로 고른 좌표
 *
 * 좌표 형식을 쓰는 이유는 검색 결과가 우리 목록에 없기 때문이다. id를 새로 발급해
 * 서버에 저장하는 대신 좌표를 그대로 URL에 담으면, 검색해서 찾은 경로도
 * 링크 하나로 공유된다.
 *
 * 대전 밖 좌표는 받지 않는다. 위험도 데이터가 대전 안에만 있어서
 * 밖으로 나가면 노출 점수가 의미를 잃는다.
 */
export function resolvePlace(
  param: string | undefined,
  fallbackId: string,
): { place: Place; outOfArea: boolean } {
  const fallback = PLACE_BY_ID[fallbackId];

  if (!param) return { place: fallback, outOfArea: false };

  // ① 미리 정의된 장소
  const preset = PLACE_BY_ID[param];
  if (preset) return { place: preset, outOfArea: false };

  // ② 자유 검색 좌표
  const decoded = decodePlaceId(param);
  if (!decoded) return { place: fallback, outOfArea: false };

  const districtId = findDistrictAt(decoded.lat, decoded.lng);
  if (!districtId) {
    // 대전 밖이면 기본 장소로 되돌리고 화면에서 알린다
    return { place: fallback, outOfArea: true };
  }

  return {
    place: {
      id: param,
      name: decoded.name,
      districtId,
      coord: [decoded.lat, decoded.lng],
      category: '검색',
    },
    outOfArea: false,
  };
}
