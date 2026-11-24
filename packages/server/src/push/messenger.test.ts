/** Tests of createLogMessenger. */
import { expect, it } from 'vitest';
import { subscription } from '../test-utils/app.js';
import { createLogMessenger } from './messenger.js';

it('createLogMessenger: logs instead of sending and reports nothing stale', async () => {
  expect(await createLogMessenger().send([subscription('a')], { title: 'T', body: 'B' })).toEqual({
    staleEndpoints: [],
  });
});
