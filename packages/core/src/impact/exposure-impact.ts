/** How much less smog a better hour means: PM2.5 breathed in at the planned hour and at the better one. */
import type { Intensity } from '../catalog/activities.js';
import { BREATHING_M3_PER_HOUR } from '../catalog/impact-factors.js';
import type { ReportHour } from '../schemas/air-report.js';
import type { ExposureImpact } from '../advice/advice-schema.js';

/** Below this, a "better" hour is within the forecast's noise and not worth a number. */
const MIN_PERCENT_LESS = 5;

/** Micrograms of PM2.5 breathed in: concentration × air breathed per hour × hours. */
export const dose = (pm25: number, intensity: Intensity, minutes: number): number =>
  pm25 * BREATHING_M3_PER_HOUR[intensity] * (minutes / 60);

/**
 * The PM2.5 an adult breathes in during the activity at the planned hour and
 * at the better one, and how much less that is. Null with no better hour, or
 * when the difference is too small to mean anything.
 */
export function exposureImpact(
  hours: { readonly planned: ReportHour; readonly better: ReportHour | null },
  intensity: Intensity,
  minutes: number,
): ExposureImpact | null {
  const { planned, better } = hours;
  if (better === null || planned.pm25 <= 0) return null;
  const percentLess = Math.round((1 - better.pm25 / planned.pm25) * 100);
  if (percentLess < MIN_PERCENT_LESS) return null;
  return {
    percentLess,
    plannedMicrograms: Math.round(dose(planned.pm25, intensity, minutes)),
    betterMicrograms: Math.round(dose(better.pm25, intensity, minutes)),
    minutes,
  };
}
