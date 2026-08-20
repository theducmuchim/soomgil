import type { KmaIndexResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildStagnationResponse } from '@/mocks/raw/kma';
import { kstYmdH } from '@/lib/utils/time';

/** 기상청 대기정체지수 — 연중 제공. 대전 분지 지형의 핵심 보정 지표 */
export function fetchStagnation(
  scenario: Scenario,
  areaNo: string,
  time: string = kstYmdH(),
): Promise<KmaIndexResponse> {
  return callPublicApi<KmaIndexResponse>({
    name: '대기정체지수',
    endpoint: ENDPOINTS.stagnation,
    params: { areaNo, time, dataType: 'JSON', pageNo: 1, numOfRows: 10 },
    revalidate: CACHE_TTL.stagnation,
    mock: () => buildStagnationResponse(scenario, areaNo),
  });
}
