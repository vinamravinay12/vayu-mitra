import { useCallback } from 'react';
import type { Api, Household } from '../api/api.js';
import type { PushOutcome } from '../push/push.js';

export interface PushControls {
  /** False when the server has no Web Push key: alerts cannot be offered. */
  readonly available: boolean;
  readonly enable: () => Promise<PushOutcome>;
  readonly disable: () => Promise<void>;
}

/**
 * Turns this browser's alerts on and off. The push code loads only when the
 * family turns alerts on; the subscription goes to the server, and is removed
 * there when alerts are turned off.
 */
export function usePush(
  vapidKey: string | null,
  api: Api,
  onHousehold: (household: Household) => void,
): PushControls {
  const enable = useCallback(async (): Promise<PushOutcome> => {
    if (vapidKey === null) return 'unsupported';
    const { enablePush } = await import('../push/push.js');
    return enablePush(vapidKey, (subscription) =>
      api.addPushSubscription(subscription).then(onHousehold),
    );
  }, [api, onHousehold, vapidKey]);
  const disable = useCallback(async (): Promise<void> => {
    const { disablePush } = await import('../push/push.js');
    await disablePush((endpoint) => api.removePushSubscription(endpoint).then(onHousehold));
  }, [api, onHousehold]);
  return { available: vapidKey !== null, enable, disable };
}
