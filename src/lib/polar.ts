import { Polar } from '@polar-sh/sdk';

export function getPolarProductId(): string | null {
  const id = process.env.POLAR_PRODUCT_ID?.trim();
  return id || null;
}

export function getPolarClient(): Polar | null {
  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const env = process.env.POLAR_SERVER?.trim().toLowerCase();
  const server = env === 'sandbox' ? 'sandbox' : env === 'production' ? 'production' : undefined;
  return new Polar({ accessToken: token, ...(server ? { server } : {}) });
}

export const FREE_SEARCH_LIMIT = 3;
