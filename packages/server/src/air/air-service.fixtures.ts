/** Air-service test helpers: Delhi and fixture sources with overrides. */
import { NOW } from '../test-utils/fake-llm.js';
import { type AirSources } from './air-service.js';
import { fixtureSources } from './build-sources.js';
import { FIXTURE_PLACES } from './fixture-air.js';

/** New Delhi from the fixture places. */
export const DELHI = FIXTURE_PLACES[0] ?? { latitude: 28.61, longitude: 77.21 };

/** Fixture air sources, with any of them replaced. */
export function sources(overrides: Partial<AirSources> = {}): AirSources {
  return { ...fixtureSources(NOW), ...overrides };
}
