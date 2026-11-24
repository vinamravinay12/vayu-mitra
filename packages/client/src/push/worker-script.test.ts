import { describe, expect, it, vi } from 'vitest';
import { SERVICE_WORKER_URL, WORKER_POLICY, workerScript } from './worker-script.js';

/** A Trusted Types factory that records the rules it was given and wraps URLs in a marker. */
function fakeFactory() {
  const rules: { createScriptURL?: (input: string) => string } = {};
  const createPolicy = vi.fn(
    (_name: string, given: { readonly createScriptURL: (input: string) => string }) => {
      rules.createScriptURL = given.createScriptURL;
      return {
        createScriptURL: (input: string) => ({ toString: () => given.createScriptURL(input) }),
      };
    },
  );
  return { factory: { createPolicy }, createPolicy, rules };
}

describe('workerScript', () => {
  it('is the plain URL where the browser has no Trusted Types', () => {
    expect(workerScript(undefined)).toBe(SERVICE_WORKER_URL);
    expect(workerScript()).toBe(SERVICE_WORKER_URL);
  });

  it('vouches for the worker through one named policy, created once', () => {
    const { factory, createPolicy } = fakeFactory();
    expect(String(workerScript(factory))).toBe(SERVICE_WORKER_URL);
    expect(String(workerScript(factory))).toBe(SERVICE_WORKER_URL);
    expect(createPolicy).toHaveBeenCalledTimes(1);
    expect(createPolicy).toHaveBeenCalledWith(WORKER_POLICY, expect.any(Object));
  });

  it('refuses any other script URL', () => {
    const { factory, rules } = fakeFactory();
    workerScript(factory);
    expect(() => rules.createScriptURL?.('https://evil.example.test/x.js')).toThrow(
      'Refusing script URL',
    );
  });
});
