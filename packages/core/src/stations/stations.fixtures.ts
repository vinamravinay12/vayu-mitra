/** Station-test helpers: a point in Delhi and the parts of a result tests compare. */
import { nearestStation } from './nearest-station.js';

/** A point in central Delhi. */
export const HOME = { latitude: 28.6139, longitude: 77.209 };

/** The parts of a nearest-station result the tests compare. */
export const pick = (station: ReturnType<typeof nearestStation>) => ({
  aqi: station?.aqi.value,
  category: station?.aqi.category,
  dominant: station?.aqi.dominant,
});
