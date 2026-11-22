import { logEvent } from '../logging/log.js';

/** A notification for the family's devices. */
export interface PushMessage {
  readonly title: string;
  readonly body: string;
}

/**
 * Sends notifications to a family's devices, by Firebase Installation ID;
 * reports which ids are no longer registered, so they can be dropped.
 */
export interface Messenger {
  send(ids: readonly string[], message: PushMessage): Promise<{ readonly staleIds: string[] }>;
}

/** Development stand-in: logs what would be sent. */
export function createLogMessenger(): Messenger {
  return {
    send(ids, message) {
      logEvent('INFO', 'push (not sent: Firebase not configured)', {
        devices: ids.length,
        title: message.title,
      });
      return Promise.resolve({ staleIds: [] });
    },
  };
}
