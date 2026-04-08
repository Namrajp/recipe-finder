import { test, expect, type Page } from '@playwright/test';
import {
  loginAsUser,
  mockAuthenticatedDataApis,
  mockRecipesSuccess,
  mockCheckout,
  fixtureRecipes,
} from './helpers';

async function waitAuthReady(page: Page) {
  await expect(page.locator('[data-auth-ready="true"]')).toBeAttached({ timeout: 15_000 });
}

test.describe('homepage guest', () => {
  test('renders and sign-in is visible', async ({ page }) => {
    await page.goto('/');
    await waitAuthReady(page);
    await expect(page.getByRole('heading', { name: 'Recipe Finder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('search without auth opens login modal', async ({ page }) => {
    await page.goto('/');
    await waitAuthReady(page);
    await page.locator('#ingredient-input').fill('tomato');
    await page.locator('#ingredient-input').press('Enter');
    await page.getByRole('button', { name: /Suggest Recipes/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in with email' })).toBeVisible();
  });

  test('ingredient add/remove, no duplicates, no empty chip', async ({ page }) => {
    await page.goto('/');
    await waitAuthReady(page);
    const input = page.locator('#ingredient-input');
    await input.fill('tomato');
    await input.press('Enter');
    await input.fill('tomato');
    await input.press('Enter');
    await expect(page.getByText('tomato', { exact: true })).toHaveCount(1);

    await page.getByRole('button', { name: /^Remove tomato$/i }).click();
    await expect(page.getByText('tomato', { exact: true })).toHaveCount(0);

    await input.fill('   ');
    await input.blur();
    await input.press('Enter');
    await expect(page.locator('span.bg-orange-100')).toHaveCount(0);
  });
});

test.describe('authenticated search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockAuthenticatedDataApis(page, {
      subscription: { usedSearches: 1, limit: 3, isPro: false },
    });
    await mockRecipesSuccess(page);
    await page.goto('/');
    await waitAuthReady(page);
  });

  test('recipe search shows cards and usage counter', async ({ page }) => {
    await page.locator('#ingredient-input').fill('tomato');
    await page.locator('#ingredient-input').press('Enter');
    await page.getByRole('button', { name: /Suggest Recipes/i }).click();
    await expect(page.getByText('Tomato Soup')).toBeVisible();
    await expect(page.getByText(/1 of 3 free searches/i)).toBeVisible();
  });
});

test.describe('free tier limit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockAuthenticatedDataApis(page, {
      subscription: { usedSearches: 3, limit: 3, isPro: false },
    });
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 402,
        json: {
          code: 'QUOTA_EXCEEDED',
          limit: 3,
          used: 3,
          error: 'Free search limit reached',
        },
      });
    });
    await mockCheckout(page);
    await page.goto('/');
    await waitAuthReady(page);
  });

  test('shows upgrade prompt at limit', async ({ page }) => {
    await page.locator('#ingredient-input').fill('tomato');
    await page.locator('#ingredient-input').press('Enter');
    await page.getByRole('button', { name: /Suggest Recipes/i }).click();
    await expect(page.getByText('Free searches used')).toBeVisible();
    await expect(page.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();
  });
});

test.describe('pro subscriber', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockAuthenticatedDataApis(page, {
      subscription: {
        isPro: true,
        usedSearches: 10,
        limit: 3,
        cancelAtPeriodEnd: false,
      },
    });
    await mockRecipesSuccess(page);
    await page.goto('/');
    await waitAuthReady(page);
  });

  test('shows Pro infinity and cancel control', async ({ page }) => {
    await expect(page.getByLabel('Pro subscriber')).toBeVisible();
    await expect(page.getByText('Pro ∞')).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel at period end/i })).toBeVisible();
  });
});

test.describe('post-checkout upgrade state', () => {
  test('shows Pro and removes upgrade after returning home', async ({ page }) => {
    await loginAsUser(page);
    await page.addInitScript(() => {
      window.sessionStorage.setItem('checkout_pending_at', String(Date.now()));
    });

    await page.route('**/api/bookmarks**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { bookmarks: [] } });
        return;
      }
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.route('**/api/history**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { history: [] } });
        return;
      }
      await route.fulfill({ status: 200, json: { history: [] } });
    });

    let subscriptionCallCount = 0;
    await page.route('**/api/subscription', async (route) => {
      subscriptionCallCount += 1;
      const isPro = subscriptionCallCount >= 2;
      await route.fulfill({
        status: 200,
        json: {
          isPro,
          cancelAtPeriodEnd: false,
          usedSearches: isPro ? 3 : 3,
          limit: 3,
        },
      });
    });

    await mockRecipesSuccess(page);
    await page.goto('/');
    await waitAuthReady(page);

    await expect(page.getByLabel('Pro subscriber')).toBeVisible();
    await expect(page.getByRole('button', { name: /Upgrade to Pro/i })).toHaveCount(0);

    await page.locator('#ingredient-input').fill('tomato');
    await page.locator('#ingredient-input').press('Enter');
    await page.getByRole('button', { name: /Suggest Recipes/i }).click();
    await expect(page.getByText('Tomato Soup')).toBeVisible();
  });
});

test.describe('bookmarks page', () => {
  test('lists bookmarks and remove works', async ({ page }) => {
    await loginAsUser(page);
    await mockAuthenticatedDataApis(page, {
      bookmarks: [fixtureRecipes[0]],
      subscription: { isPro: false, usedSearches: 0, limit: 3 },
    });
    await page.goto('/bookmarks');
    await waitAuthReady(page);
    await expect(page.getByText('Tomato Soup')).toBeVisible();
    await page.getByRole('button', { name: /Remove bookmark/i }).first().click();
    await expect(page.getByText('Tomato Soup')).toHaveCount(0);
  });
});
