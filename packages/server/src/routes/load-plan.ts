import { buildPlan, type CleanAirPlan, type HouseholdProfile } from '@vayu/core';
import type { AirService } from '../air/air-service.js';
import { screenHeuristic } from '../guard/screen-input.js';
import type { PlanRequest } from '../validation/schemas.js';

/** Free text inside a profile (names and the place) that ends up in a prompt. */
export const profileText = (profile: HouseholdProfile): string =>
  [profile.place.name, profile.place.region, ...profile.members.map((member) => member.name)].join(
    '\n',
  );

/** True when names or the place carry instruction-like text. */
export const profileLooksUnsafe = (profile: HouseholdProfile): boolean =>
  !screenHeuristic(profileText(profile)).safe;

/**
 * Rebuilds the plan on the server from the profile and a forecast the server
 * fetched itself. The browser's own numbers are never trusted: the AI is
 * grounded only in what this process computed.
 */
export async function loadPlan(
  air: AirService,
  request: PlanRequest,
  now: Date,
): Promise<CleanAirPlan> {
  const snapshot = await air.forecast(
    request.profile.place.latitude,
    request.profile.place.longitude,
  );
  return buildPlan({ profile: request.profile, air: snapshot, now, chosenIds: request.chosenIds });
}
