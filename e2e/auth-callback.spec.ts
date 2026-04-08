import { test, expect } from '@playwright/test';

test.describe('/auth/callback', () => {
  test('missing code redirects to home', async ({ page }) => {
    await page.goto('/auth/callback');
    await page.waitForURL((u) => new URL(u).pathname === '/');
    const u = new URL(page.url());
    expect(u.pathname).toBe('/');
    await expect.poll(() => new URL(page.url()).search).toBe('');
  });

  test('invalid code redirects to home', async ({ page }) => {
    await page.goto('/auth/callback?code=not-a-real-pkce-code');
    await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 30_000 });
    const u = new URL(page.url());
    expect(u.pathname).toBe('/');
    await expect.poll(() => new URL(page.url()).search).toBe('');
  });

  test('open-redirect next param is ignored when unsafe', async ({ page }) => {
    await page.goto('/auth/callback?next=https://evil.example');
    await page.waitForURL((u) => new URL(u).pathname === '/');
    expect(page.url()).not.toContain('evil.example');
    const u = new URL(page.url());
    expect(u.pathname).toBe('/');
  });
});
