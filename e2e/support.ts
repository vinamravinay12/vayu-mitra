/** Steps and checks the browser journeys share. */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG tags axe runs, colour contrast included (jsdom axe cannot check contrast). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Collects console errors, page errors and CSP violations for the whole test. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Fails with the full violation list if axe finds anything on the current page. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const report = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(report.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

/** True when the page is wider than the viewport and would scroll sideways. */
export async function scrollsHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** The password every browser test account uses. */
export const PASSWORD = 'correct horse battery';

/** A fresh email for each account. */
export const newEmail = (): string =>
  `family-${String(Date.now())}-${String(Math.random()).slice(2, 8)}@example.test`;

/** Fills the account form (the confirmation too, when creating an account) and submits it. */
export async function submitCredentials(
  page: Page,
  button: string,
  { email, password = PASSWORD }: { readonly email: string; readonly password?: string },
) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const confirm = page.getByLabel('Confirm password');
  if (await confirm.isVisible()) await confirm.fill(password);
  await page.getByRole('button', { name: button }).click();
}

/** Creates a new account, which starts with an empty household; returns its email. */
export async function freshStart(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  const email = newEmail();
  await submitCredentials(page, 'Create account', { email });
  await expect(page.getByRole('heading', { name: 'Where are you?' })).toBeVisible();
  return email;
}

/** Picks New Delhi and waits for its air. */
export async function pickDelhi(page: Page): Promise<void> {
  await page.getByLabel('Area or city').fill('Delhi');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'New Delhi, Delhi, India' }).click();
  await expect(page.getByRole('heading', { name: 'Air in New Delhi' })).toBeVisible();
  await expect(page.getByText(/^Measured at New Delhi \(sample station\)/)).toBeVisible();
}

/** What the household remembers in the memory journey. */
export const MEMORY = {
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
