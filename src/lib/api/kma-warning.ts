import type { WthrWrnResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildWarningResponse } from '@/mocks/raw/kma';
import { kstYmd } from '@/lib/utils/time';

/** 대전지방기상청 지점번호 */
const DAEJEON_STN_ID = '133';

/** 기상청 기상특보 목록 — 폭염 · 한파 · 황사 · 미세먼지 특보 */
export function fetchWarnings(
  scenario: Scenario,
  now: Date = new Date(),
  preview = false,
): Promise<WthrWrnResponse> {
  // 특보는 며칠 전에 발표돼 아직 발효 중일 수 있어서 3일치를 받아온다
  const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  return callPublicApi<WthrWrnResponse>({
    name: '기상특보',
    endpoint: ENDPOINTS.warning,
    params: {
      stnId: DAEJEON_STN_ID,
      fromTmFc: kstYmd(from),
      toTmFc: kstYmd(now),
      dataType: 'JSON',
      pageNo: 1,
      numOfRows: 50,
    },
    forceMock: preview,
    revalidate: CACHE_TTL.warning,
    mock: () => buildWarningResponse(scenario),
  });
}
