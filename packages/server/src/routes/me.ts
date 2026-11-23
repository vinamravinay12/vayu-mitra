import { alertSettingsSchema, memorySchema, placeSchema } from '@vayu/core';
import { Router, type Request, type Response } from 'express';
import type { z } from 'zod';
import { userOf } from '../auth/require-user.js';
import { MAX_PUSH_IDS, newUserRecord, publicView, type UserRecord } from '../store/user-record.js';
import type { UserStore } from '../store/user-store.js';
import { pushIdSchema } from '../validation/request-schemas.js';

/**
 * The family's own record: read it, change one part of it, or delete it all.
 * Every handler works only on the verified user's document.
 */
export function meRouter(store: UserStore, now: () => Date): Router {
  const router = Router();
  const load = async (uid: string): Promise<UserRecord> =>
    (await store.get(uid)) ?? newUserRecord(now());

  /** PUT/POST handler that validates the body and applies it to the record. */
  const update =
    <S extends z.ZodType>(
      schema: S,
      apply: (record: UserRecord, value: z.infer<S>) => UserRecord,
    ) =>
    async (request: Request, response: Response): Promise<void> => {
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
  router.post(
    '/me/push-id',
    update(pushIdSchema, (record, { id }) => ({
      ...record,
      pushIds: [...record.pushIds.filter((known) => known !== id), id].slice(-MAX_PUSH_IDS),
    })),
  );
  router.delete(
    '/me/push-id',
    update(pushIdSchema, (record, { id }) => ({
      ...record,
      pushIds: record.pushIds.filter((known) => known !== id),
    })),
  );
  router.delete('/me', async (_request, response) => {
    await store.delete(userOf(response));
    response.status(204).end();
  });
  return router;
}
