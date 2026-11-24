import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, freshStart, pickDelhi } from './support.js';

/**
 * What axe cannot judge from the markup alone: the size of every target on a
 * real screen (2.5.5 and 2.5.8), the page under a forced palette such as
 * Windows High Contrast, and text enlarged to 200% (1.4.4, 1.4.10).
 */

/** Smallest size, in CSS pixels, of anything a finger has to hit. */
const MIN_TARGET = 44;

/** Each visible control smaller than the minimum target, named for the failure message. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((minimum) => {
    const controls = document.querySelectorAll<HTMLElement>(
      'button, summary, select, textarea, input:not([type="checkbox"]):not([type="radio"]), label:has(> input[type="radio"])',
    );
    return [...controls]
      .filter((control) => control.offsetParent !== null)
      .filter((control) => {
        const box = control.getBoundingClientRect();
        return box.height < minimum || box.width < minimum;
      })
      .map((control) => control.getAttribute('aria-label') ?? control.textContent.trim());
  }, MIN_TARGET);
}

/** Opens the full home screen: an account, a place, and one answered question. */
async function homeWithAdvice(page: Page): Promise<void> {
  await freshStart(page);
  await pickDelhi(page);
  await page.getByLabel('Your message').fill('Can I go for a walk at 4 pm?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('region', { name: /^Walk: / })).toBeVisible();
}

test('every button, field and theme choice is a 44 px target', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await homeWithAdvice(page);
  expect(await smallTargets(page)).toEqual([]);
});

test('a forced palette keeps controls outlined and the page accessible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await homeWithAdvice(page);
  await expectNoAxeViolations(page);
  const send = page.getByRole('button', { name: 'Send' });
  const border = await send.evaluate((button) => getComputedStyle(button).borderTopStyle);
  expect(border).toBe('solid');
});

test('text at 200% still fits the screen without sideways scrolling', async ({ page }) => {
  await homeWithAdvice(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
