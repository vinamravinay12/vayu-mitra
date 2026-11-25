/** Impact-test helpers: hours with PM2.5, and households with a car and trips. */
import { makeReport } from '../test-utils/fixtures.js';
import { EMPTY_MEMORY, type Memory, type RoutineFact } from '../memory/memory-schema.js';
import type { AirReport } from '../schemas/air-report.js';

/** A report whose hours carry PM2.5 alongside the index, one value per hour. */
export const reportWithPm25 = (hours: readonly [aqi: number, pm25: number][]): AirReport => {
  const report = makeReport(hours.map(([aqi]) => aqi));
  return {
    ...report,
    hours: report.hours.map((hour, index) => ({ ...hour, pm25: hours[index]?.[1] ?? 0 })),
  };
};

/** A routine of the given activity and length. */
export const routine = (
  activity: RoutineFact['activity'],
  minutes: number,
  id = `routine:${activity}`,
): RoutineFact => ({ kind: 'routine', id, activity, personId: null, time: '08:00', minutes });

/** A household with the given routines, and a car unless told otherwise. */
export const household = (routines: readonly RoutineFact[], car = true): Memory => ({
  ...EMPTY_MEMORY,
  routines: [...routines],
  home: car ? [{ kind: 'home', id: 'home:car', feature: 'car' }] : [],
});
