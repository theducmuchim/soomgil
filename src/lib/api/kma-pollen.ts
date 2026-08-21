import type { KmaIndexResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildPollenResponse, type PollenKind } from '@/mocks/raw/kma';
import { kstYmdH } from '@/lib/utils/time';

export type { PollenKind };

/** 기상청 꽃가루농도위험지수 — 소나무(3~6월) · 참나무(3~6월) · 잡초류(8~10월) */
export function fetchPollen(
  scenario: Scenario,
  areaNo: string,
  kind: PollenKind,
  time: string = kstYmdH(),
  preview = false,
): Promise<KmaIndexResponse> {
  return callPublicApi<KmaIndexResponse>({
    name: `꽃가루(${kind})`,
    endpoint: ENDPOINTS.pollen[kind],
    params: { areaNo, time, dataType: 'JSON', pageNo: 1, numOfRows: 10 },
    forceMock: preview,
    revalidate: CACHE_TTL.pollen,
    mock: () => buildPollenResponse(scenario, areaNo, kind),
  });
}
