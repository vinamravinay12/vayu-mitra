/** Engine-test data: reports, stations and people. */
import type { Forecast } from '../stations/anchor-forecast.js';
import type { StationReading } from '../stations/station.js';
import { nowHour, type AirReport, type ReportHour } from '../schemas/air-report.js';
import { categoryOf } from '../aqi/compute-aqi.js';
import type { PersonFact } from '../memory/memory-schema.js';

/** 10:00 IST on 22 November 2026. */
export const NOW = new Date('2026-11-22T04:30:00.000Z');

const IST = 19_800;

/** A winter PM2.5 curve: worst around 02:00, cleanest around 14:00. */
function winterCurve(mean: number, swing = 0.45): number[] {
  return Array.from(
    { length: 24 },
    (_unused, hour) =>
      Math.round(mean * (1 + swing * Math.cos((2 * Math.PI * (hour - 2)) / 24)) * 10) / 10,
  );
}

/** A two-day model forecast for Delhi starting at midnight on 22 November. */
export function makeForecast(todayMean = 150, tomorrowMean = todayMean): Forecast {
  const days: [string, number][] = [
    ['2026-11-22', todayMean],
    ['2026-11-23', tomorrowMean],
  ];
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: IST,
    source: 'fixture',
    hours: days.flatMap(([day, mean]) =>
      winterCurve(mean).map((pm25, hour) => ({
        time: `${day}T${String(hour).padStart(2, '0')}:00`,
        pm25,
        pm10: Math.round(pm25 * 1.6),
      })),
    ),
  };
}

/** A CPCB station reading near central Delhi. */
export function makeStation(overrides: Partial<StationReading> = {}): StationReading {
  return {
    id: 'ito',
    name: 'ITO, Delhi - CPCB',
    latitude: 28.6289,
    longitude: 77.2411,
    source: 'cpcb',
    observedAt: '2026-11-22T10:00:00+05:30',
    pollutants: { pm25: 180, pm10: 290, no2: 60, so2: 12, co: 1.5, o3: 30 },
    ...overrides,
  };
}

/** A report whose hours from 10:00 have exactly the given index values. */
export function makeReport(aqis: readonly number[], overrides: Partial<AirReport> = {}): AirReport {
  const hours: ReportHour[] = aqis.map((aqi, index) => {
    const total = 10 + index;
    const day = total >= 24 ? '2026-11-23' : '2026-11-22';
    return {
      time: `${day}T${String(total % 24).padStart(2, '0')}:00`,
      pm25: 0,
      pm10: 0,
      aqi,
      category: categoryOf(aqi),
    };
  });
  const first = nowHour({ hours });
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: IST,
    fetchedAt: NOW.toISOString(),
    current: { aqi: first.aqi, category: first.category, dominant: 'pm25', basis: 'station' },
    station: {
      name: 'ITO, Delhi - CPCB',
      source: 'cpcb',
      distanceKm: 2.1,
      observedAt: '2026-11-22T10:00:00+05:30',
    },
    hours,
    forecastSource: 'fixture',
    ...overrides,
  };
}

/** Dadi: an older adult with asthma. */
export const DADI: PersonFact = {
  kind: 'person',
  id: 'person:dadi',
  label: 'Dadi',
  ageGroup: 'senior',
  conditions: ['asthma'],
};

/** Papa: an adult with no conditions. */
export const PAPA: PersonFact = {
  kind: 'person',
  id: 'person:papa',
  label: 'Papa',
  ageGroup: 'adult',
  conditions: [],
};

/** The value, failing the test when it is null or undefined. */
export function definite<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}
