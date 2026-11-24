import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import './jitless.js';

describe('zod under the CSP', () => {
  it('never compiles validators with eval', () => {
    expect(z.config().jitless).toBe(true);
  });
});
