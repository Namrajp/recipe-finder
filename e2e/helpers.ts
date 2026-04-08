import type { Page } from '@playwright/test';

export const e2eUser = { id: 'e2e-user-id', email: 'e2e@test.com' };

export const fixtureRecipes = [
  {
    id: 'tomato-soup',
    title: 'Tomato Soup',
    description: 'Warm and simple.',
    cookTime: '20 minutes',
    difficulty: 'Easy' as const,
    ingredients: ['tomatoes', 'salt'],
    instructions: ['Simmer', 'Blend'],
  },
  {
    id: 'egg-scramble',
    title: 'Egg Scramble',
    description: 'Quick breakfast.',
    cookTime: '10 minutes',
    difficulty: 'Easy' as const,
    ingredients: ['eggs'],
    instructions: ['Whisk', 'Cook'],
  },
  {
    id: 'pasta-aglio',
    title: 'Pasta Aglio',
    description: 'Garlic pasta.',
    cookTime: '25 minutes',
    difficulty: 'Medium' as const,
    ingredients: ['pasta', 'garlic'],
    instructions: ['Boil pasta', 'Fry garlic'],
  },
  {
    id: 'salad-bowl',
    title: 'Salad Bowl',
    description: 'Fresh salad.',
    cookTime: '15 minutes',
    difficulty: 'Easy' as const,
    ingredients: ['lettuce'],
    instructions: ['Chop', 'Toss'],
  },
];

export async function loginAsUser(page: Page, user = e2eUser) {
  await page.addInitScript((u: { id: string; email: string }) => {
    window.__user = u;
  }, user);
}

export async function mockAuthenticatedDataApis(
  page: Page,
  opts: {
    bookmarks?: typeof fixtureRecipes;
    history?: string[][];
    subscription?: Record<string, unknown>;
  } = {}
) {
  const bookmarks = opts.bookmarks ?? [];
  const history = opts.history ?? [];
  const subscription = {
    isPro: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    usedSearches: 0,
    limit: 3,
    ...opts.subscription,
  };

  await page.route('**/api/bookmarks**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      await route.fulfill({ status: 200, json: { bookmarks } });
      return;
    }
    if (req.method() === 'POST') {
      await route.fulfill({ status: 200, json: { ok: true } });
      return;
    }
    if (req.method() === 'DELETE') {
      await route.fulfill({ status: 200, json: { ok: true } });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/history**', async (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes('/history/clear')) {
      await route.fulfill({ status: 200, json: { ok: true } });
      return;
    }
    if (req.method() === 'GET') {
      await route.fulfill({ status: 200, json: { history } });
      return;
    }
    if (req.method() === 'POST') {
      await route.fulfill({ status: 200, json: { history } });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/subscription**', async (route) => {
    const url = route.request().url();
    if (url.includes('/cancel') && route.request().method() === 'POST') {
      await route.fulfill({ status: 200, json: { ok: true } });
      return;
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: subscription });
      return;
    }
    await route.continue();
  });
}

export async function mockRecipesSuccess(page: Page) {
  await page.route('**/api/recipes', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      json: { recipes: fixtureRecipes, cached: false },
    });
  });
}

export async function mockCheckout(page: Page) {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      json: { url: 'https://example.com/checkout' },
    });
  });
}
