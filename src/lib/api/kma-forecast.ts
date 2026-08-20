import type { VilageFcstResponse } from './types';
import type { DistrictId } from '@/types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildVilageFcstResponse } from '@/mocks/raw/kma';
import { DISTRICT_BY_ID } from '@/data/districts';
import { kstParts, kstYmd } from '@/lib/utils/time';

/** 단기예보 발표 시각 (하루 8회) */
const BASE_TIMES = [2, 5, 8, 11, 14, 17, 20, 23];

/**
 * 지금 시점에서 조회 가능한 가장 최근 발표 회차를 구한다.
 *
 * 발표 시각 +10분쯤 지나야 실제로 데이터가 올라오기 때문에 여유를 둔다.
 * 02시 발표 전(00:00~02:09)이면 전날 23시 발표를 써야 한다.
 */
export function latestBaseDateTime(now: Date = new Date()): {
  base_date: string;
  base_time: string;
} {
  const { hour, minute } = kstParts(now);
  const decimalHour = hour + minute / 60;

  const usable = BASE_TIMES.filter((h) => decimalHour >= h + 0.2);

  if (usable.length === 0) {
    // 자정~02:12 → 전날 23시 발표
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { base_date: kstYmd(yesterday), base_time: '2300' };
  }

  const h = usable[usable.length - 1];
  return { base_date: kstYmd(now), base_time: `${String(h).padStart(2, '0')}00` };
}

/**
 * 기상청 단기예보 — 기온(TMP) · 습도(REH) · 풍속(WSD) · 풍향(VEC)
 *
 * 체감온도는 이 응답에 없다. 여기서 받은 TMP·REH·WSD로
 * lib/risk/apparent-temp.ts 가 직접 산출한다.
 */
export function fetchVilageFcst(
  scenario: Scenario,
  districtId: DistrictId,
  now: Date = new Date(),
): Promise<VilageFcstResponse> {
  const { grid } = DISTRICT_BY_ID[districtId];
  const { base_date, base_time } = latestBaseDateTime(now);

  return callPublicApi<VilageFcstResponse>({
    name: `단기예보(${districtId})`,
    endpoint: ENDPOINTS.vilageFcst,
    params: {
      base_date,
      base_time,
      nx: grid.nx,
      ny: grid.ny,
      dataType: 'JSON',
      pageNo: 1,
      numOfRows: 1000,
    },
    revalidate: CACHE_TTL.forecast,
    mock: () => buildVilageFcstResponse(scenario, districtId),
  });
}
