import type { PlaceAir } from '@vayu/core';
import type { AirService } from '../air/air-service.js';
import { describeCause, logEvent } from '../logging/log.js';

/** Places one message may ask about besides the family's own. */
export const MAX_OTHER_PLACES = 3;

/** The air in one named place: the first match in India, else the first match; null if none. */
async function airIn(air: AirService, name: string): Promise<PlaceAir | null> {
  try {
    const found = await air.places(name);
    const place = found.find((candidate) => candidate.country === 'India') ?? found[0];
    if (place === undefined) return null;
    return { name: place.name, report: await air.report(place.latitude, place.longitude) };
  } catch (cause) {
    logEvent('WARNING', 'air for another place unavailable', { cause: describeCause(cause) });
    return null;
  }
}

/**
 * The air now in the places a message asks about ("Is Gurgaon better than
 * Ghaziabad?"), looked up and fetched in parallel through the same cached air
 * service as the family's own place. A place that cannot be found or fetched
 * is left out rather than failing the turn.
 */
export async function airElsewhere(air: AirService, names: readonly string[]): Promise<PlaceAir[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter((name) => name.length >= 2))];
  const results = await Promise.all(
    unique.slice(0, MAX_OTHER_PLACES).map((name) => airIn(air, name)),
  );
  const seen = new Set<string>();
  return results.filter((place): place is PlaceAir => {
    if (place === null || seen.has(place.name)) return false;
    seen.add(place.name);
    return true;
  });
}
