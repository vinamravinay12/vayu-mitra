/** Tests of zod under the CSP. */
import { z } from 'zod';
import { expect, it } from 'vitest';
import './jitless.js';

it('zod under the CSP: never compiles validators with eval', () => {
  expect(z.config().jitless).toBe(true);
});
