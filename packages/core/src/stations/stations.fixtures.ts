import { nearestStation } from './nearest-station.js';

export const HOME = { latitude: 28.6139, longitude: 77.209 };

export const pick = (station: ReturnType<typeof nearestStation>) => ({
  aqi: station?.aqi.value,
  category: station?.aqi.category,
  dominant: station?.aqi.dominant,
});
