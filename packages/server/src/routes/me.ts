import { alertSettingsSchema, memorySchema, placeSchema } from '@vayu/core';
import { Router, type Request, type Response } from 'express';
import type { z } from 'zod';
import { userOf } from '../auth/require-user.js';
import {
  MAX_PUSH_SUBSCRIPTIONS,
  newUserRecord,
  publicView,
  type UserRecord,
} from '../store/user-record.js';
import type { UserStore } from '../store/user-store.js';
import { clearSessionCookie } from '../auth/sessions.js';
import { pushEndpointSchema, pushSubscriptionSchema } from '../validation/request-schemas.js';

/** A handler that validates a body and applies it to the signed-in family's record. */
type Update = <S extends z.ZodType>(
  schema: S,
  apply: (record: UserRecord, value: z.infer<S>) => UserRecord,
) => (request: Request, response: Response) => Promise<void>;

/** Adding and removing this device's push subscription, newest five kept. */
function pushRoutes(router: Router, update: Update): void {
  router.post(
    '/me/push-subscription',
    update(pushSubscriptionSchema, (record, subscription) => ({
      ...record,
      pushSubscriptions: [
        ...record.pushSubscriptions.filter((known) => known.endpoint !== subscription.endpoint),
        subscription,
      ].slice(-MAX_PUSH_SUBSCRIPTIONS),
    })),
  );
  router.delete(
    '/me/push-subscription',
    update(pushEndpointSchema, (record, { endpoint }) => ({
      ...record,
      pushSubscriptions: record.pushSubscriptions.filter((known) => known.endpoint !== endpoint),
    })),
  );
}

/**
 * The family's own record: read it, change one part of it, or delete it all,
 * account included. Every handler works only on the signed-in user's document.
 */
export function meRouter(
  store: UserStore,
  now: () => Date,
  deleteAccount: (uid: string) => Promise<void>,
): Router {
  const router = Router();
  const load = async (uid: string): Promise<UserRecord> =>
    (await store.get(uid)) ?? newUserRecord(now());

  /** PUT/POST handler that validates the body and applies it to the record. */
  const update: Update = (schema, apply) => async (request, response) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'That change was not valid.' });
      return;
    }
    const uid = userOf(response);
    const record = { ...apply(await load(uid), parsed.data), updatedAt: now().toISOString() };
    await store.put(uid, record);
    response.json(publicView(record));
  };

  router.get('/me', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json(publicView(await load(userOf(response))));
  });
  router.put(
    '/me/memory',
    update(memorySchema, (record, memory) => ({ ...record, memory })),
  );
  router.put(
    '/me/place',
    update(placeSchema, (record, place) => ({ ...record, place })),
  );
  router.put(
    '/me/alerts',
    update(alertSettingsSchema, (record, alerts) => ({ ...record, alerts })),
  );
  pushRoutes(router, update);
  router.delete('/me', async (_request, response) => {
    const uid = userOf(response);
    await store.delete(uid);
    await deleteAccount(uid);
    response.setHeader('Set-Cookie', clearSessionCookie());
    response.status(204).end();
  });
  return router;
}
