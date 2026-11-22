import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type CollectionReference } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type { OAuth2Client } from 'google-auth-library';
import type { IdTokenVerifier, SchedulerVerifier } from '../auth/verifiers.js';
import type { SchedulerSettings } from '../firebase-config.js';
import type { Messenger } from '../push/messenger.js';
import type { DocumentCollection } from '../store/user-store.js';

/**
 * Thin adapters from the Firebase Admin SDK to the server's own interfaces.
 * Each one is a direct call with no logic of its own beyond mapping results,
 * so the logic that matters is tested against fakes of these interfaces.
 */

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
    async delete(id) {
      await collection.doc(id).delete();
    },
    async whereEquals(field, value) {
      const snapshot = await collection.where(field, '==', value).get();
      return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
    },
  };
}

/** FCM error codes that mean the installation will never receive again. */
const STALE_ID_CODES = new Set([
  'messaging/installation-id-not-registered',
  'messaging/invalid-argument',
]);

/**
 * FCM → Messenger, addressed by Firebase Installation ID (FID), the browser
 * SDK's current registration. Data-only messages: the app's own service
 * worker shows them, so the notification looks the same on every browser.
 */
export function fcmMessenger(messaging: Pick<Messaging, 'sendEachForMulticast'>): Messenger {
  return {
    async send(ids, message) {
      const batch = await messaging.sendEachForMulticast({
        fids: [...ids],
        data: { title: message.title, body: message.body, url: '/' },
        webpush: { headers: { Urgency: 'high', TTL: String(6 * 60 * 60) } },
      });
      const staleIds = batch.responses.flatMap((response, index) =>
        !response.success && STALE_ID_CODES.has(response.error?.code ?? '')
          ? ids.slice(index, index + 1)
          : [],
      );
      return { staleIds };
    },
  };
}

/** Firebase Auth → IdTokenVerifier. */
export const firebaseVerifier =
  (auth: Pick<ReturnType<typeof getAuth>, 'verifyIdToken'>): IdTokenVerifier =>
  async (idToken) => {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid };
  };

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

/** Every binding for one Firebase app. */
export function firebaseBindings(app: App) {
  return {
    users: firestoreCollection(getFirestore(app).collection('users')),
    messenger: fcmMessenger(getMessaging(app)),
    verifyIdToken: firebaseVerifier(getAuth(app)),
  };
}
