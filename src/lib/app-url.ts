/**
 * Canonical public URL for production (Vercel, custom domain).
 * When the browser or request Host is localhost / 127.0.0.1, we always use that origin first
 * so NEXT_PUBLIC_APP_URL can stay set to production in .env.local without breaking local magic links.
 */

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

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
 * Localhost tab always wins over NEXT_PUBLIC_APP_URL so local dev matches Supabase localhost redirects.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window === 'undefined') return '';
  if (isLocalHostname(window.location.hostname)) {
    return window.location.origin;
  }
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
  const requestUrl = new URL(request.url);
  if (isLocalHostname(requestUrl.hostname)) {
    return requestUrl.origin;
  }
  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;
  const prod = productionFallbackOrigin(true);
  if (prod) return prod;
  return requestUrl.origin;
}

/**
 * Server: base URL (scheme + host, no trailing slash) for APIs (e.g. Polar success URL).
 */
export function resolvePublicBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const hostname = host.split(':')[0] ?? host;
    if (isLocalHostname(hostname)) {
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const proto = forwardedProto || 'http';
      return `${proto}://${host}`;
    }
  }

  const envOrigin = originFromEnv();
  if (envOrigin) return envOrigin;
  const prod = productionFallbackOrigin(true);
  if (prod) return prod;

  if (!host) return 'http://localhost:3000';

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = forwardedProto || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}
