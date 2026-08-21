import type { AirkoreaRealtimeItem, AirkoreaResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildRealtimeResponse } from '@/mocks/raw/airkorea';

/**
 * 에어코리아 시도별 실시간 측정정보 (sidoName=대전).
 *
 * 대전 전체 측정소를 한 번에 받아오므로 자치구가 몇 개든 호출은 1회다.
 * 미세먼지·오존의 구 단위 해상도는 격자가 아니라 이 응답에서 나온다.
 */
export function fetchAirRealtime(
  scenario: Scenario,
  preview = false,
): Promise<AirkoreaResponse<AirkoreaRealtimeItem>> {
  return callPublicApi<AirkoreaResponse<AirkoreaRealtimeItem>>({
    name: '에어코리아 실시간',
    endpoint: ENDPOINTS.airRealtime,
    params: {
      sidoName: '대전',
      returnType: 'json',
      ver: '1.3',
      pageNo: 1,
      numOfRows: 100,
    },
    forceMock: preview,
    revalidate: CACHE_TTL.airkorea,
    mock: () => buildRealtimeResponse(scenario),
  });
}
