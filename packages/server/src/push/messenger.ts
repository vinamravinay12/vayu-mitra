/** The interface for sending notifications, and a logging stand-in. */
import { logEvent } from '../logging/log.js';
import type { PushSubscriptionJson } from '../validation/request-schemas.js';

/** A notification for the family's devices. */
interface PushMessage {
  readonly title: string;
  readonly body: string;
}

/**
 * Sends notifications to a family's devices by their Web Push subscriptions;
 * reports which endpoints are gone, so they can be dropped.
 */
export interface Messenger {
  send(
    subscriptions: readonly PushSubscriptionJson[],
    message: PushMessage,
  ): Promise<{ readonly staleEndpoints: string[] }>;
}

/** Development stand-in: logs what would be sent. */
export function createLogMessenger(): Messenger {
  return {
    send(subscriptions, message) {
      logEvent('INFO', 'push (not sent: Web Push not configured)', {
        devices: subscriptions.length,
        title: message.title,
      });
      return Promise.resolve({ staleEndpoints: [] });
    },
  };
}
