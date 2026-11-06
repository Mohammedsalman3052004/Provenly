import { expect, test, type BrowserContext } from '@playwright/test';

/**
 * Critical flow: signup -> create dashboard -> add project -> share link hiding the money field
 * -> open the link in a brand-new (incognito-like) context and prove the hidden value is nowhere.
 * Needs a Supabase project with "Confirm email" turned OFF (see the setup guide).
 */
const email = `e2e+${Date.now()}@example.com`;
const AMOUNT_INPUT = '7777.01';
const AMOUNT_MINOR = '777701';

test('hidden fields never reach the public page or its network responses', async ({ page, browser }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/app**');

  await page.goto('/app/new');
  await page.getByPlaceholder('Freelancing Projects').fill('E2E Freelancing');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Create and add first project/ }).click();
  await page.waitForURL('**/add');

  const field = (name: string) => page.locator(`.form-grid > div:has(label:text-is("${name}")) input`).first();
  await field('Project Name *').fill('Acme Website').catch(async () => field('Project Name').fill('Acme Website'));
  await field('Project Amount').fill(AMOUNT_INPUT);
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL('**/projects');
  await expect(page.getByText('Acme Website').first()).toBeVisible();

  await page.goto(page.url().replace('/projects', '/share'));
  await page.getByRole('button', { name: '+ New share link' }).click();
  await page.getByPlaceholder('Resume link').fill('Resume');
  // money fields are "sensitive" in the template, so they are pre-hidden; assert it
  await expect(page.getByLabel('Project Amount')).not.toBeChecked();
  await page.getByRole('button', { name: 'Create link' }).click();
  const linkText = await page.locator('.num', { hasText: '/s/' }).first().innerText();
  const url = linkText.trim();

  const incognito: BrowserContext = await browser.newContext();
  const pub = await incognito.newPage();
  const bodies: string[] = [];
  pub.on('response', async (r) => { try { bodies.push(await r.text()); } catch { /* binary */ } });
  await pub.goto(url);
  await expect(pub.getByText('Acme Website').first()).toBeVisible();
  const html = await pub.content();
  for (const haystack of [html, ...bodies]) {
    expect(haystack).not.toContain(AMOUNT_MINOR);
    expect(haystack).not.toContain('7,777.01');
    expect(haystack).not.toContain('Project Amount');
  }
  await incognito.close();
});
