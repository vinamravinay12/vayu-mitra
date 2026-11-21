import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Real-browser journeys against the production build, served with the
 * production security headers, the offline AI client and fixture air data.
 */

/** WCAG tags axe runs, colour contrast included (jsdom axe cannot check contrast). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** A description the offline reader understands. */
const DESCRIPTION =
  'We live in New Delhi. Grandfather has asthma and takes a morning walk. We cook on LPG and burn agarbatti.';

/** Collects console errors, page errors and CSP violations for the whole test. */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Fails with the full violation list if axe finds anything on the current page. */
async function expectNoAxeViolations(page: Page): Promise<void> {
  const report = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(report.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

/** True when the page is wider than the viewport and would scroll sideways. */
async function scrollsHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** Describes the household, checks the profile, and opens the plan. */
async function reachThePlan(page: Page): Promise<void> {
  await page.getByLabel('Describe your household').fill(DESCRIPTION);
  await page.getByRole('button', { name: 'Build my clean-air plan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your household' })).toBeVisible();
  await expect(page.getByText('Forecast for New Delhi, Delhi, India.')).toBeVisible();
  await page.getByRole('button', { name: 'See today’s plan' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Today’s air' })).toBeVisible();
}

test('serves the production security headers', async ({ request }) => {
  const response = await request.get('/');
  const policy = response.headers()['content-security-policy'] ?? '';
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("'unsafe-inline'");
  expect(response.headers()['strict-transport-security']).toBeDefined();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('every stage and tab is accessible, with no console errors', async ({ page }) => {
      const pageErrors = collectPageErrors(page);
      await page.goto('/');
      await expectNoAxeViolations(page);
      await reachThePlan(page);
      await expectNoAxeViolations(page);
      for (const tab of [/^Actions/, /^Impact$/, /^AI coach$/]) {
        await page.getByRole('tab', { name: tab }).click();
        await expectNoAxeViolations(page);
      }
      expect(pageErrors).toEqual([]);
    });
  });
}

test('ticking an action updates the impact at once', async ({ page }) => {
  await page.goto('/');
  await reachThePlan(page);
  await page.getByRole('tab', { name: /^Actions/ }).click();
  const impact = page.getByText(/actions? chosen|No actions chosen/);
  const before = await impact.innerText();
  await page.getByRole('tabpanel').getByRole('checkbox').first().click();
  await expect(impact).not.toHaveText(before);
});

test('the coach explains the plan even with the AI offline', async ({ page }) => {
  await page.goto('/');
  await reachThePlan(page);
  await page.getByRole('tab', { name: 'AI coach' }).click();
  await page.getByRole('button', { name: 'Explain my plan' }).click();
  await expect(page.getByText('this is the engine’s own summary of your plan')).toBeVisible();
});

test('no stage scrolls sideways', async ({ page }) => {
  await page.goto('/');
  expect(await scrollsHorizontally(page)).toBe(false);
  await reachThePlan(page);
  expect(await scrollsHorizontally(page)).toBe(false);
});

test('a reload restores the plan, and Start over clears it', async ({ page }) => {
  await page.goto('/');
  await reachThePlan(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Today’s air' })).toBeVisible();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByLabel('Describe your household')).toBeVisible();
});
