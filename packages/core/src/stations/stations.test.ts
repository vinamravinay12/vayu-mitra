/** Tests of distanceKm, stationAqi, nearestStation, stationReadingSchema, correctionRatio and nowHour. */
import { expect, it } from 'vitest';
import { makeStation, NOW } from '../test-utils/fixtures.js';
import { correctionRatio } from './anchor-forecast.js';
import {
  distanceKm,
  MAX_STATION_DISTANCE_KM,
  nearestStation,
  stationAqi,
} from './nearest-station.js';
import { stationReadingSchema } from './station.js';
import { nowHour } from '../schemas/air-report.js';
import { HOME } from './stations.fixtures.js';

const modelNow = { time: '2026-11-22T10:00', pm25: 100, pm10: 160 };

const near = (pollutants: Record<string, number>) => {
  const station = makeStation({ pollutants });
  return {
    station,
    distanceKm: 1,
    aqi: { value: 1, category: 'good' as const, dominant: 'pm25' as const },
  };
};

it('distanceKm: measures great-circle distance', () => {
  expect(distanceKm(HOME, HOME)).toBe(0);
  // Connaught Place to ITO is about 3.5 km.
  expect(distanceKm(HOME, makeStation())).toBeCloseTo(3.5, 0);
});

it('stationAqi: computes full NAQI for CPCB and the particulate index for WAQI', () => {
  expect(stationAqi(makeStation())?.dominant).toBe('pm25');
  const waqi = makeStation({ source: 'waqi', pollutants: { pm25: 100, no2: 900, so2: 1 } });
  expect(stationAqi(waqi)?.dominant).toBe('pm25');
});

it('stationAqi: falls back to particulates when CPCB reports too few pollutants', () => {
  expect(stationAqi(makeStation({ pollutants: { pm10: 120 } }))?.value).toBe(113);
  expect(stationAqi(makeStation({ pollutants: { no2: 50 } }))).toBeNull();
});

it('nearestStation: picks the closest fresh station with a reading', () => {
  const near = makeStation({ id: 'near', latitude: 28.615, longitude: 77.21 });
  const far = makeStation({ id: 'far' });
  expect(nearestStation(HOME, [far, near], NOW)?.station.id).toBe('near');
  expect(nearestStation(HOME, [near, far], NOW)?.station.id).toBe('near');
});

it('nearestStation: prefers CPCB over a slightly closer WAQI station', () => {
  const waqi = makeStation({ id: 'w', source: 'waqi', latitude: 28.614, longitude: 77.2095 });
  const cpcb = makeStation({ id: 'c', latitude: 28.625, longitude: 77.209 });
  expect(nearestStation(HOME, [waqi, cpcb], NOW)?.station.id).toBe('c');
});

it('nearestStation: ignores stale, distant and unusable stations', () => {
  const stale = makeStation({ observedAt: '2026-11-22T05:00:00+05:30' });
  const distant = makeStation({ latitude: 28.9, longitude: 77.2 });
  const empty = makeStation({ pollutants: {} });
  expect(distanceKm(HOME, distant)).toBeGreaterThan(MAX_STATION_DISTANCE_KM);
  expect(nearestStation(HOME, [stale, distant, empty], NOW)).toBeNull();
  expect(nearestStation(HOME, [], NOW)).toBeNull();
});

it('nearestStation: rounds the distance to 0.1 km', () => {
  expect(nearestStation(HOME, [makeStation()], NOW)?.distanceKm).toBe(3.5);
});

it('stationReadingSchema: accepts a normalised reading and refuses faults', () => {
  expect(stationReadingSchema.safeParse(makeStation()).success).toBe(true);
  expect(stationReadingSchema.safeParse(makeStation({ pollutants: { pm25: 5000 } })).success).toBe(
    false,
  );
});

it('correctionRatio: compares PM2.5, then PM10, and clamps', () => {
  expect(correctionRatio(null, modelNow)).toBe(1);
  expect(correctionRatio(near({ pm25: 150 }), modelNow)).toBe(1.5);
  expect(correctionRatio(near({ pm10: 80 }), modelNow)).toBe(0.5);
  expect(correctionRatio(near({ pm25: 900 }), modelNow)).toBe(3);
  expect(correctionRatio(near({ pm25: 1 }), modelNow)).toBeCloseTo(1 / 3);
  expect(correctionRatio(near({ no2: 10 }), modelNow)).toBe(1);
  expect(correctionRatio(near({ pm25: 50 }), { ...modelNow, pm25: 0, pm10: 0 })).toBe(1);
});

it('nowHour: refuses a report with no hours', () => {
  expect(() => nowHour({ hours: [] })).toThrow(/at least one hour/);
});
