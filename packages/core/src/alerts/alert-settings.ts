/** Alert settings and alert history, as stored for each family. */
import { z } from 'zod';
import { TIME_OF_DAY_PATTERN } from '../time/local-clock.js';

/** Categories a family can choose to be alerted at. */
export const ALERT_THRESHOLDS = ['moderate', 'poor', 'very-poor', 'severe'] as const;

/** A family’s alert settings: on or off, from which category, and quiet hours. */
export const alertSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  threshold: z.enum(ALERT_THRESHOLDS),
  /** No notifications from quietStart to quietEnd, local time; may wrap past midnight. */
  quietStart: z.string().regex(TIME_OF_DAY_PATTERN),
  quietEnd: z.string().regex(TIME_OF_DAY_PATTERN),
});

/** What the last alert was, so the next check knows whether to stay quiet. */
export const alertStateSchema = z.object({
  lastSentAt: z.iso.datetime().nullable(),
  /** Category rank of the last alert; null once the air has dropped below the threshold. */
  lastSentRank: z.number().int().min(0).max(5).nullable(),
});

/** A family’s alert settings. */
export type AlertSettings = z.infer<typeof alertSettingsSchema>;
/** When the family was last alerted, and at what category. */
export type AlertState = z.infer<typeof alertStateSchema>;

/** Alerts off, from Very poor, quiet from 10 pm to 7 am. */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: false,
  threshold: 'very-poor',
  quietStart: '22:00',
  quietEnd: '07:00',
};

/** No alert sent yet. */
export const INITIAL_ALERT_STATE: AlertState = { lastSentAt: null, lastSentRank: null };
