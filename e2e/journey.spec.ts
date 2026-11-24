import { expect, test } from '@playwright/test';
import {
  MEMORY,
  collectPageErrors,
  expectNoAxeViolations,
  freshStart,
  newEmail,
  pickDelhi,
  PASSWORD,
  scrollsHorizontally,
  submitCredentials,
} from './support.js';

/**
 * Real-browser journeys against the production build, served with the
 * production security headers, email-and-password accounts, no Gemini key
 * (the engine answers) and fixture air data. Each test creates its own account.
 */

test.describe.configure({ mode: 'serial' });

test('serves security headers and a locked-down session cookie, and hides the scheduler', async ({
  request,
}) => {
  const response = await request.get('/');
  const policy = response.headers()['content-security-policy'] ?? '';
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("'unsafe-inline'");
  expect(response.headers()['strict-transport-security']).toBeDefined();
  expect((await request.post('/api/internal/check-alerts')).status()).toBe(404);
  const signedUp = await request.post('/api/auth/register', {
    data: { email: newEmail(), password: PASSWORD },
  });
  expect(signedUp.status()).toBe(201);
  expect(signedUp.headers()['set-cookie']).toMatch(
    /^__Host-vayu_session=.+; Path=\/; HttpOnly; Secure; SameSite=Strict/,
  );
});

test('signs out, refuses a wrong password, and signs back in to the same household', async ({
  page,
}) => {
  const email = await freshStart(page);
  await pickDelhi(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expectNoAxeViolations(page);
  await submitCredentials(page, 'Sign in', { email, password: 'not the password' });
  await expect(page.getByRole('alert')).toContainText('do not match an account');
  await submitCredentials(page, 'Sign in', { email });
  await expect(page.getByRole('heading', { name: 'Air in New Delhi' })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme}: place, question and advice are accessible, with no console errors`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const pageErrors = collectPageErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoAxeViolations(page);
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

test('deleting the data deletes the account and signs out', async ({ page }) => {
  const email = await freshStart(page);
  await pickDelhi(page);
  await page.getByRole('button', { name: 'Delete my data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await submitCredentials(page, 'Sign in', { email });
  await expect(page.getByRole('alert')).toContainText('do not match an account');
});
