/** Tests of fieldOf. */
import { describe, expect, it } from 'vitest';
import { fieldOf } from './field-of.js';

describe('fieldOf', () => {
  it('reads a property of an object, and nothing from anything else', () => {
    expect(fieldOf({ code: 6 }, 'code')).toBe(6);
    expect(fieldOf(new Error('boom'), 'message')).toBe('boom');
    expect(fieldOf({}, 'code')).toBeUndefined();
    expect(fieldOf(null, 'code')).toBeUndefined();
    expect(fieldOf('text', 'length')).toBeUndefined();
  });
});
