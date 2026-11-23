import type { CollectionReference } from '@google-cloud/firestore';
import type { OAuth2Client } from 'google-auth-library';
import type webpush from 'web-push';
import type { SchedulerVerifier } from '../auth/require-user.js';
import { logEvent } from '../logging/log.js';
import type { Messenger } from '../push/messenger.js';
import type { PushSettings, SchedulerSettings } from '../settings.js';
import { AlreadyExistsError, type DocumentCollection } from '../store/user-store.js';

/**
 * Thin adapters from Google Cloud and Web Push SDKs to the server's own
 * interfaces. Each is a direct call that only maps results, so the logic that
 * matters is tested against fakes of these interfaces.
 */

/** Firestore's status code for "document already exists". */
const ALREADY_EXISTS = 6;

/** Firestore collection → DocumentCollection. */
export function firestoreCollection(collection: CollectionReference): DocumentCollection {
  return {
    async get(id) {
      const snapshot = await collection.doc(id).get();
      return snapshot.data();
    },
    async set(id, data) {
      await collection.doc(id).set(data as Record<string, unknown>);
    },
    async create(id, data) {
      try {
        await collection.doc(id).create(data as Record<string, unknown>);
      } catch (cause) {
        if ((cause as { code?: unknown }).code === ALREADY_EXISTS) throw new AlreadyExistsError(id);
        throw cause;
      }
    },
    async delete(id) {
      await collection.doc(id).delete();
    },
    async whereEquals(field, value) {
      const snapshot = await collection.where(field, '==', value).get();
      return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
    },
  };
}

/** Push service answers meaning the subscription is gone for good. */
const GONE_STATUSES = new Set([404, 410]);

/** Six hours: an air alert older than that is no longer news. */
const PUSH_TTL_SECONDS = 6 * 60 * 60;

/** Web Push (VAPID) → Messenger. One encrypted message per device, sent in parallel. */
export function webPushMessenger(
  sender: Pick<typeof webpush, 'sendNotification'>,
  settings: PushSettings,
): Messenger {
  const options = {
    vapidDetails: {
      subject: settings.subject,
      publicKey: settings.publicKey,
      privateKey: settings.privateKey,
    },
    TTL: PUSH_TTL_SECONDS,
    urgency: 'high' as const,
  };
  return {
    async send(subscriptions, message) {
      const payload = JSON.stringify({ title: message.title, body: message.body });
      const outcomes = await Promise.allSettled(
        subscriptions.map((subscription) =>
          sender.sendNotification(subscription, payload, options),
        ),
      );
      return {
        staleEndpoints: outcomes.flatMap((outcome, index) => {
          if (outcome.status === 'fulfilled') return [];
          const status = (outcome.reason as { statusCode?: unknown }).statusCode;
          logEvent('WARNING', 'push failed for one device', { status: String(status) });
          return GONE_STATUSES.has(Number(status))
            ? subscriptions.slice(index, index + 1).map((s) => s.endpoint)
            : [];
        }),
      };
    },
  };
}

/** Google OIDC → SchedulerVerifier: signed by Google, for our audience, from the scheduler's account. */
export const oidcSchedulerVerifier =
  (client: Pick<OAuth2Client, 'verifyIdToken'>, settings: SchedulerSettings): SchedulerVerifier =>
  async (idToken) => {
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: settings.audience });
      const payload = ticket.getPayload();
      return payload?.email === settings.serviceAccountEmail && payload.email_verified === true;
    } catch {
      return false;
    }
  };
