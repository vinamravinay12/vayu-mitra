import { describe, expect, it } from 'vitest';
import { createLogMessenger } from './messenger.js';

describe('createLogMessenger', () => {
  it('logs instead of sending and reports nothing stale', async () => {
    expect(await createLogMessenger().send(['a'], { title: 'T', body: 'B' })).toEqual({
      staleIds: [],
    });
  });
});
