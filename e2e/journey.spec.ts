import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Real-browser journeys against the production build, served with the
 * production security headers, no Gemini key (the engine answers) and fixture
 * air data. Sign-in is off, so every test shares one local household; each
 * starts by deleting it and the run is serial.
 */

/** WCAG tags axe runs, colour contrast included (jsdom axe cannot check contrast). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** What the household remembers in the memory journey. */
const MEMORY = {
  people: [
    {
      kind: 'person',
      id: 'person:dadi',
      label: 'Dadi',
      ageGroup: 'senior',
      conditions: ['asthma'],
    },
  ],
  routines: [
    {
      kind: 'routine',
      id: 'routine:walk:dadi',
      activity: 'walk',
      personId: 'person:dadi',
      time: '06:30',
      minutes: 30,
    },
  ],
  home: [{ kind: 'home', id: 'home:n95-masks', feature: 'n95-masks' }],
};

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

/** Starts from an empty household. */
async function freshStart(page: Page): Promise<void> {
  await page.request.delete('/api/me');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Where are you?' })).toBeVisible();
}

/** Picks New Delhi and waits for its air. */
async function pickDelhi(page: Page): Promise<void> {
  await page.getByLabel('Area or city').fill('Delhi');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'New Delhi, Delhi, India' }).click();
  await expect(page.getByRole('heading', { name: 'Air in New Delhi' })).toBeVisible();
  await expect(page.getByText(/^Measured at New Delhi \(sample station\)/)).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('serves the production security headers and hides the scheduler route', async ({
  request,
}) => {
  const response = await request.get('/');
  const policy = response.headers()['content-security-policy'] ?? '';
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("'unsafe-inline'");
  expect(response.headers()['strict-transport-security']).toBeDefined();
  expect((await request.post('/api/internal/check-alerts')).status()).toBe(404);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme}: place, question and advice are accessible, with no console errors`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const pageErrors = collectPageErrors(page);
    await freshStart(page);
    await expectNoAxeViolations(page);
    await pickDelhi(page);
    await expectNoAxeViolations(page);
    await page.getByLabel('Your message').fill('Can I go for a walk this evening at 6 pm?');
    await page.getByRole('button', { name: 'Send' }).click();
    const advice = page.getByRole('region', { name: /^Walk: / });
    await expect(advice).toBeVisible();
    await expect(advice.getByText('Planned')).toBeVisible();
    await expectNoAxeViolations(page);
    expect(await scrollsHorizontally(page)).toBe(false);
    expect(pageErrors).toEqual([]);
  });
}

test('memory chips can be edited and forgotten, and shape the suggestions', async ({ page }) => {
  await freshStart(page);
  await pickDelhi(page);
  await page.request.put('/api/me/memory', { data: MEMORY });
  await page.reload();
  await expect(page.getByText('Dadi · older adult, asthma')).toBeVisible();
  await expect(
    page.getByRole('button', { name: "Is Dadi's walk at 6:30 am OK today?" }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit Dadi · older adult, asthma' }).click();
  await page.getByRole('checkbox', { name: 'asthma' }).uncheck();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Dadi · older adult', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Forget N95 masks at home' }).click();
  await expect(page.getByText('N95 masks at home')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Dadi · older adult', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: "Is Dadi's walk at 6:30 am OK today?" }).click();
  await expect(page.getByRole('region', { name: /^Walk: / })).toContainText('Dadi');
});

test('deleting the data starts over', async ({ page }) => {
  await freshStart(page);
  await pickDelhi(page);
  await page.getByRole('button', { name: 'Delete my data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page.getByRole('heading', { name: 'Where are you?' })).toBeVisible();
});
