/** Test setup for jsdom: DOM matchers, axe matchers and clean-up between tests. */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup never
// registers. Without this, renders leak between tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
