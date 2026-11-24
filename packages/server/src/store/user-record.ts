/** The family’s stored record, and the view of it the browser gets. */
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
import { pushSubscriptionSchema } from '../validation/request-schemas.js';

/** Devices registered for push per family: a phone, a laptop and a couple of spares. */
export const MAX_PUSH_SUBSCRIPTIONS = 5;

/**
 * Everything stored about one signed-in family. No name, e-mail or chat
 * transcript: the memory chips, the chosen place, alert settings and the
 * push subscriptions of the devices to notify. Deleting the account deletes this one document.
 */
export const userRecordSchema = z.object({
  memory: memorySchema,
  place: placeSchema.nullable(),
  alerts: alertSettingsSchema,
  alertState: alertStateSchema,
  pushSubscriptions: z.array(pushSubscriptionSchema).max(MAX_PUSH_SUBSCRIPTIONS),
  updatedAt: z.iso.datetime(),
});

/** A family’s stored record. */
export type UserRecord = z.infer<typeof userRecordSchema>;

/** A family the app has not seen before. */
export const newUserRecord = (now: Date): UserRecord => ({
  memory: EMPTY_MEMORY,
  place: null,
  alerts: DEFAULT_ALERT_SETTINGS,
  alertState: INITIAL_ALERT_STATE,
  pushSubscriptions: [],
  updatedAt: now.toISOString(),
});

/** What the browser is shown: everything but the devices' push addresses. */
export const publicView = ({ pushSubscriptions, ...rest }: UserRecord) => ({
  ...rest,
  pushEnabled: pushSubscriptions.length > 0,
});
