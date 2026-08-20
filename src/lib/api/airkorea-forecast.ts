import type { AirkoreaForecastItem, AirkoreaResponse } from './types';
import type { Scenario } from '@/mocks/scenarios';
import { callPublicApi } from './client';
import { ENDPOINTS } from './endpoints';
import { CACHE_TTL } from '@/lib/env';
import { buildForecastResponse } from '@/mocks/raw/airkorea';
import { kstParts } from '@/lib/utils/time';

/**
 * 에어코리아 대기질 예보통보.
 *
 * 현재값이 아니라 "오늘/내일 예보"라서 위험 점수 계산에는 쓰지 않는다.
 * 경로 안내 화면에서 "오늘 오후에는 나빠질 예정" 같은 문구를 붙일 때 쓴다.
 */
export function fetchAirForecast(
  scenario: Scenario,
  now: Date = new Date(),
): Promise<AirkoreaResponse<AirkoreaForecastItem>> {
  const { year, month, day } = kstParts(now);
  const searchDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return callPublicApi<AirkoreaResponse<AirkoreaForecastItem>>({
    name: '에어코리아 예보',
    endpoint: ENDPOINTS.airForecast,
    params: { searchDate, returnType: 'json', pageNo: 1, numOfRows: 100 },
    revalidate: CACHE_TTL.airkoreaForecast,
    mock: () => buildForecastResponse(scenario),
  });
}
