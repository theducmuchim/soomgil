import type { AirkoreaRealtimeItem, AirkoreaResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi, type FallbackSink } from './client';
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
  sink?: FallbackSink,
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
    // 에어코리아는 장애 중에도 '00 정상'과 함께 측정값 0건을 돌려준다.
    // 그대로 받으면 미세먼지가 전부 빠진 채 '실시간'으로 표시되므로 실패로 본다.
    requireItems: true,
    sink,
    revalidate: CACHE_TTL.airkorea,
    mock: () => buildRealtimeResponse(scenario),
  });
}
