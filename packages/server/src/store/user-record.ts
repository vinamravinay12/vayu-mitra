import {
  alertSettingsSchema,
  alertStateSchema,
  DEFAULT_ALERT_SETTINGS,
  EMPTY_MEMORY,
  INITIAL_ALERT_STATE,
  memorySchema,
  placeSchema,
} from '@vayu/core';
import { z } from 'zod';

/** Devices registered for push per family: a phone, a laptop and a couple of spares. */
export const MAX_PUSH_IDS = 5;

/**
 * Everything stored about one signed-in family. No name, e-mail or chat
 * transcript: the memory chips, the chosen place, alert settings and the
 * installation ids of the devices to notify. Deleting the account deletes this one document.
 */
export const userRecordSchema = z.object({
  memory: memorySchema,
  place: placeSchema.nullable(),
  alerts: alertSettingsSchema,
  alertState: alertStateSchema,
  pushIds: z.array(z.string().min(1).max(256)).max(MAX_PUSH_IDS),
  updatedAt: z.iso.datetime(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;

/** A family the app has not seen before. */
export const newUserRecord = (now: Date): UserRecord => ({
  memory: EMPTY_MEMORY,
  place: null,
  alerts: DEFAULT_ALERT_SETTINGS,
  alertState: INITIAL_ALERT_STATE,
  pushIds: [],
  updatedAt: now.toISOString(),
});

/** What the browser is shown: everything but the device ids. */
export const publicView = ({ pushIds, ...rest }: UserRecord) => ({
  ...rest,
  pushEnabled: pushIds.length > 0,
});
