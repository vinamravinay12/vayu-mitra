/** Substitution (Liskov) check: every Messenger reports stale endpoints from among the ones it was given. */
import { describe, expect, it } from 'vitest';
import { webPushMessenger } from '../gcp/bindings.js';
import { subscription } from '../test-utils/app.js';
import { createLogMessenger, type Messenger } from './messenger.js';

/** A Web Push sender that delivers to every device except those whose service says they are gone. */
const sender = {
  sendNotification: ({ endpoint }: { endpoint: string }) =>
    endpoint.endsWith('gone')
      ? Promise.reject(Object.assign(new Error('Gone'), { statusCode: 410 }))
      : Promise.resolve({ statusCode: 201, body: '', headers: {} }),
};

/** Each implementation. */
const MESSENGERS: [string, Messenger][] = [
  ['logging stand-in', createLogMessenger()],
  [
    'Web Push',
    webPushMessenger(sender, { publicKey: 'p', privateKey: 'k', subject: 'mailto:a@b.test' }),
  ],
];

describe.each(MESSENGERS)('a messenger (%s)', (_name, messenger) => {
  it('answers for every device and names only endpoints it was given as stale', async () => {
    const devices = [subscription('a'), subscription('gone')];
    const { staleEndpoints } = await messenger.send(devices, {
      title: 'Severe air',
      body: 'Stay in.',
    });
    const given = devices.map((device) => device.endpoint);
    expect(staleEndpoints.every((endpoint) => given.includes(endpoint))).toBe(true);
    expect(await messenger.send([], { title: 't', body: 'b' })).toEqual({ staleEndpoints: [] });
  });
});
