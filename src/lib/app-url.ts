/**
 * Canonical public URL for production (Vercel, custom domain).
 * Priority: NEXT_PUBLIC_APP_URL → Vercel deployment URL (production) → request / window.
 * Set NEXT_PUBLIC_APP_URL to your custom domain on Vercel; VERCEL_URL is usually *.vercel.app.
 */

function originFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Server: VERCEL_URL is set on Vercel builds (no protocol). */
function vercelServerOrigin(): string | null {
  const v = process.env.VERCEL_URL?.trim();
  if (!v) return null;
  const withProto = v.startsWith('http') ? v : `https://${v}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

/** Client: baked via next.config.js from VERCEL_URL at build time. */
function vercelClientOrigin(): string | null {
  const v = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (!v) return null;
  const withProto = v.startsWith('http') ? v : `https://${v}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

function productionFallbackOrigin(isServer: boolean): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  return isServer ? vercelServerOrigin() : vercelClientOrigin();
}

/**
 * Client: origin for Supabase `emailRedirectTo` (magic link).
 * In production, avoids using localhost when the tab origin is wrong or unset.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window === 'undefined') return '';
  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;
  const prod = productionFallbackOrigin(false);
  if (prod) return prod;
  return window.location.origin;
}

/**
 * Server: canonical origin for redirects after auth or when building absolute URLs.
 */
export function resolvePublicOrigin(request: Request): string {
  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;
  const prod = productionFallbackOrigin(true);
  if (prod) return prod;
  return new URL(request.url).origin;
}

/**
 * Server: base URL (scheme + host, no trailing slash) for APIs (e.g. Polar success URL).
 */
export function resolvePublicBaseUrl(request: Request): string {
  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;
  const prod = productionFallbackOrigin(true);
  if (prod) return prod;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return 'http://localhost:3000';

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = forwardedProto || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}
