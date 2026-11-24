/** Memory-test data: a household that remembers Dadi. */
import { DADI } from '../test-utils/fixtures.js';
import { EMPTY_MEMORY } from './apply-changes.js';
import { type Memory } from './memory-schema.js';

/** A household that remembers only Dadi. */
export const withDadi: Memory = { ...EMPTY_MEMORY, people: [DADI] };
