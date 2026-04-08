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

/** Free recipe generations (non-cached) per billing period for non‑Pro users. Override with FREE_SEARCH_LIMIT. */
export function getFreeSearchLimit(): number {
  const raw = process.env.FREE_SEARCH_LIMIT?.trim();
  if (!raw) return 3;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 3;
}
