/**
 * Trusted Types under the real CSP: the push service worker registers through
 * the one policy the page allows, while a plain string, another policy name
 * and any other script URL are all refused by the browser.
 */
import { expect, test, type Page } from '@playwright/test';

/** The subset of the Trusted Types API the check calls in the page. */
interface PageTrustedTypes {
  createPolicy(
    name: string,
    rules: { createScriptURL: (input: string) => string },
  ): { createScriptURL(input: string): unknown };
}

/** The three ways a page might hand the browser a script URL. */
type Route = 'plain-string' | 'other-policy' | 'own-policy';

/** Tries one route in the page and says whether the browser allowed it. */
function tryInPage(page: Page, route: Route): Promise<string> {
  return page.evaluate(async (which) => {
    const factory = (window as unknown as { trustedTypes: PageTrustedTypes }).trustedTypes;
    const policy = (name: string) =>
      factory.createPolicy(name, { createScriptURL: (input) => input });
    const register = (script: unknown) =>
      navigator.serviceWorker.register(script as string, { scope: '/' });
    try {
      if (which === 'plain-string') await register('/push-sw.js');
      else if (which === 'other-policy') policy('attacker');
      else await register(policy('vayu-push-worker').createScriptURL('/push-sw.js'));
      return 'allowed';
    } catch {
      return 'refused';
    }
  }, route);
}

test('the push worker registers only through the page’s one Trusted Types policy', async ({
  page,
}) => {
  await page.goto('/');
  expect(await tryInPage(page, 'plain-string')).toBe('refused');
  expect(await tryInPage(page, 'other-policy')).toBe('refused');
  expect(await tryInPage(page, 'own-policy')).toBe('allowed');
});
