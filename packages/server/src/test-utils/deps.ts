/** Test doubles for the app’s dependencies: places, air, store, messenger. */
import { createAirService } from '../air/air-service.js';
import { fixtureSources } from '../air/build-sources.js';
import { createMemoryCollection, createUserStore } from '../store/user-store.js';
import { NOW } from './fake-llm.js';

/** The fixture place in New Delhi, as the browser sends it. */
export const DELHI = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.61,
  longitude: 77.21,
};

/** Fixture air and an empty in-memory store, at 10:00 IST on 22 November. */
export function testDeps() {
  return {
    air: createAirService(fixtureSources(NOW)),
    store: createUserStore(createMemoryCollection()),
    now: NOW,
  };
}
