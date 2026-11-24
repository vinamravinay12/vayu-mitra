import { DADI } from '../test-utils/fixtures.js';
import { EMPTY_MEMORY } from './apply-changes.js';
import { type Memory } from './memory-schema.js';

export const withDadi: Memory = { ...EMPTY_MEMORY, people: [DADI] };
