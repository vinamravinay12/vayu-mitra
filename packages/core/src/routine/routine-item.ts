/** What a routine entry is about. */
export type RoutineKind =
  'airing' | 'exercise' | 'commute' | 'purifier' | 'cooking' | 'heating' | 'peak';

/** Whether the entry is a good moment, one to be careful in, or one to avoid. */
export type RoutineTone = 'good' | 'caution' | 'avoid';

/** One entry in today's hour-by-hour routine. */
export interface RoutineItem {
  /** Local hour, 0–23. */
  readonly hour: number;
  readonly kind: RoutineKind;
  readonly tone: RoutineTone;
  readonly title: string;
  readonly detail: string;
}

/** Up to this hourly PM2.5 (NAQI moderate), being outside is reasonable. */
export const OUTDOOR_OK_PM25 = 90;

/** From this hourly PM2.5 (NAQI very poor), outdoor activity should be avoided. */
export const OUTDOOR_AVOID_PM25 = 120;

/** The tone for an outdoor activity at a given hourly PM2.5. */
export function routineTone(pm25: number): RoutineTone {
  if (pm25 <= OUTDOOR_OK_PM25) return 'good';
  return pm25 < OUTDOOR_AVOID_PM25 ? 'caution' : 'avoid';
}
