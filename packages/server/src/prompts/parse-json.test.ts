/** Tests of parseJson. */
import { expect, it } from 'vitest';
import { parseJson } from './parse-json.js';

it('parseJson: parses a bare or wrapped object', () => {
  expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  expect(parseJson('```json\n{"a":{"b":[1]}}\n```')).toEqual({ a: { b: [1] } });
});

it('parseJson: returns undefined for anything unparseable', () => {
  expect(parseJson('no json')).toBeUndefined();
  expect(parseJson('} backwards {')).toBeUndefined();
  expect(parseJson('{"a":}')).toBeUndefined();
});
