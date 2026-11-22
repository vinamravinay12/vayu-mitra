import type { FirebaseApp } from 'firebase/app';
import { useCallback } from 'react';
import type { Api, Household } from '../api/api.js';
import type { PushOutcome } from '../push/push.js';

export interface PushControls {
  /** False when the server has no Firebase or Web Push key: alerts cannot be offered. */
  readonly available: boolean;
  readonly enable: () => Promise<PushOutcome>;
  readonly disable: () => Promise<void>;
}

/**
 * Turns this browser's alerts on and off. The push code is loaded only when
 * the family turns alerts on, and the installation id it reports is sent to
 * the server; an id that goes away is removed there too.
 */
export function usePush(
  app: FirebaseApp | null,
  vapidKey: string | null,
  api: Api,
  onHousehold: (household: Household) => void,
): PushControls {
  const enable = useCallback(async (): Promise<PushOutcome> => {
    if (app === null || vapidKey === null) return 'unsupported';
    const { enablePush } = await import('../push/push.js');
    return enablePush(app, vapidKey, {
      onRegistered: (id) => {
        void api.addPushId(id).then(onHousehold);
      },
      onUnregistered: (id) => {
        void api.removePushId(id).then(onHousehold);
      },
    });
  }, [api, app, onHousehold, vapidKey]);
  const disable = useCallback(async (): Promise<void> => {
    if (app === null) return;
    const { disablePush } = await import('../push/push.js');
    await disablePush(app);
  }, [app]);
  return { available: app !== null && vapidKey !== null, enable, disable };
}
