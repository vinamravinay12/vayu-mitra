import { expect, test } from '@playwright/test';

/**
 * Trusted Types under the real CSP: the push service worker registers through
 * the one policy the page allows, while a plain string, another policy name
 * and any other script URL are all refused by the browser.
 */

/** The subset of the Trusted Types API the check calls in the page. */
interface PageTrustedTypes {
  createPolicy(
    name: string,
    rules: { createScriptURL: (input: string) => string },
  ): { createScriptURL(input: string): unknown };
}

test('the push worker registers only through the page’s one Trusted Types policy', async ({
  page,
}) => {
  await page.goto('/');
  const outcome = await page.evaluate(async () => {
    const factory = (window as unknown as { trustedTypes: PageTrustedTypes }).trustedTypes;
    const attempt = async (action: () => unknown): Promise<string> => {
      try {
        await action();
        return 'allowed';
      } catch {
        return 'refused';
      }
    };
    const worker = (script: unknown) =>
      navigator.serviceWorker.register(script as string, { scope: '/' });
    return {
      plainString: await attempt(() => worker('/push-sw.js')),
      otherPolicy: await attempt(() =>
        factory.createPolicy('attacker', { createScriptURL: (input) => input }),
      ),
      ownPolicy: await attempt(() =>
        worker(
          factory
            .createPolicy('vayu-push-worker', { createScriptURL: (input) => input })
            .createScriptURL('/push-sw.js'),
        ),
      ),
    };
  });
  expect(outcome).toEqual({ plainString: 'refused', otherPolicy: 'refused', ownPolicy: 'allowed' });
});
