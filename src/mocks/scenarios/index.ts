import type { Season } from '@/types';
import type { Scenario } from './types';
import { SPRING_SCENARIO } from './spring';
import { SUMMER_SCENARIO } from './summer';
import { AUTUMN_SCENARIO } from './autumn';
import { WINTER_SCENARIO } from './winter';

export type { Scenario, ScenarioDistrictValues, ScenarioWarning } from './types';

export const SCENARIOS: Record<Season, Scenario> = {
  spring: SPRING_SCENARIO,
  summer: SUMMER_SCENARIO,
  autumn: AUTUMN_SCENARIO,
  winter: WINTER_SCENARIO,
};

/**
 * 지금 쓸 시나리오를 고른다.
 * 시연 중 ?season=winter 로 계절을 강제할 수 있다 (mock 모드 한정).
 */
export function getScenario(season: Season): Scenario {
  return SCENARIOS[season];
}
