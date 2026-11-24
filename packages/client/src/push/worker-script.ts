/** The push worker’s URL, vouched for through the page’s one Trusted Types policy. */

/** The app's own service worker, which shows alerts while the tab is closed. */
export const SERVICE_WORKER_URL = '/push-sw.js';

/**
 * The one Trusted Types policy the page's CSP admits (`trusted-types
 * vayu-push-worker`). It vouches for the service worker's URL and refuses
 * every other script URL, so no injected string can become a script.
 */
export const WORKER_POLICY = 'vayu-push-worker';

/** Policies already made, per factory: a policy name can be created only once. */
const policies = new WeakMap<TrustedTypePolicyFactory, TrustedTypePolicy>();

/** Accepts the service worker's URL and nothing else. */
function onlyTheWorker(url: string): string {
  if (url !== SERVICE_WORKER_URL) throw new TypeError(`Refusing script URL ${url}`);
  return url;
}

/** The worker's URL as the page's CSP requires it; a plain string where there are no Trusted Types. */
export function workerScript(
  factory: TrustedTypePolicyFactory | undefined = window.trustedTypes,
): TrustedScriptURL | string {
  if (factory === undefined) return SERVICE_WORKER_URL;
  const policy =
    policies.get(factory) ??
    factory.createPolicy(WORKER_POLICY, { createScriptURL: onlyTheWorker });
  policies.set(factory, policy);
  return policy.createScriptURL(SERVICE_WORKER_URL);
}
