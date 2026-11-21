import { buildPlan, type CleanAirPlan, type HouseholdProfile } from '@vayu/core';
import { fixtureForecast } from '../air/fixture-air.js';
import { NOW, PROFILE } from './fake-llm.js';

/** The plan the server would build for `profile` on the fixture forecast. */
export function planFor(
  profile: HouseholdProfile = PROFILE,
  chosenIds: readonly string[] | null = null,
): CleanAirPlan {
  return buildPlan({
    profile,
    air: fixtureForecast(profile.place.latitude, NOW()),
    now: NOW(),
    chosenIds,
  });
}
