import { type NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolvePublicBaseUrl } from '@/lib/app-url';
import { getPolarClient, getPolarProductId } from '@/lib/polar';

function normalizeCheckoutEnvUrl(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '');
}

/** Polar share / checkout link with customer query params (no API keys required). */
function fallbackCheckoutUrl(
  raw: string,
  user: { id: string; email?: string | null },
  opts: { successUrl: string; returnUrl: string }
): string | null {
  const trimmed = normalizeCheckoutEnvUrl(raw);
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    // Polar checkout-link params have changed over time; pass multiple aliases for compatibility.
    u.searchParams.set('external_customer_id', user.id);
    u.searchParams.set('customer_external_id', user.id);
    u.searchParams.set('external_id', user.id);
    if (user.email) u.searchParams.set('customer_email', user.email);
    u.searchParams.set('success_url', opts.successUrl);
    u.searchParams.set('return_url', opts.returnUrl);
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = resolvePublicBaseUrl(request);
  const successUrl = `${base}/checkout/success`;
  const returnUrl = base;

  const polar = getPolarClient();
  const productId = getPolarProductId();
  let apiCheckoutError: string | null = null;
  // Prefer API checkout when configured, since this reliably links customer identity.
  if (polar && productId) {
    try {
      let existingCustomerId: string | undefined;
      if (user.email) {
        const list = await polar.customers.list({ email: user.email, limit: 1 });
        const firstPage = await list.next();
        const existing = firstPage?.result.items[0];
        if (existing?.id) existingCustomerId = existing.id;
      }

      const checkoutPayload = existingCustomerId
        ? {
            products: [productId],
            customerId: existingCustomerId,
            customerEmail: user.email ?? undefined,
            successUrl,
            returnUrl,
          }
        : {
            products: [productId],
            externalCustomerId: user.id,
            customerEmail: user.email ?? undefined,
            successUrl,
            returnUrl,
          };
      const checkout = await polar.checkouts.create(checkoutPayload);

      return NextResponse.json({ url: checkout.url });
    } catch (e) {
      console.error('Polar checkout API path:', e);
      apiCheckoutError = e instanceof Error ? e.message : 'Unknown Polar API error';
    }
  }

  const staticCheckout = process.env.POLAR_CHECKOUT_URL;
  if (staticCheckout?.trim()) {
    const url = fallbackCheckoutUrl(staticCheckout, user, { successUrl, returnUrl });
    if (url) {
      return NextResponse.json({ url });
    }
    return NextResponse.json(
      {
        error:
          'POLAR_CHECKOUT_URL is set but not a valid http(s) URL. Paste the full share/checkout link from Polar (sandbox or production).',
        code: 'INVALID_CHECKOUT_URL',
      },
      { status: 400 }
    );
  }

  const missing: string[] = [];
  if (!process.env.POLAR_ACCESS_TOKEN?.trim()) missing.push('POLAR_ACCESS_TOKEN');
  if (!productId) missing.push('POLAR_PRODUCT_ID');
  const env = process.env.POLAR_SERVER?.trim().toLowerCase();
  const tokenPrefix = process.env.POLAR_ACCESS_TOKEN?.trim().slice(0, 10) ?? '';
  const maybeSandboxToken = tokenPrefix.startsWith('polar_oat_');
  const envHint =
    env === 'production' && maybeSandboxToken
      ? 'POLAR_SERVER is production but token may be from sandbox. Use production token with production server.'
      : env === 'sandbox' && !maybeSandboxToken
      ? 'POLAR_SERVER is sandbox but token may be from production.'
      : undefined;
  return NextResponse.json(
    {
      error: apiCheckoutError
        ? 'Failed to create checkout with Polar API'
        : 'Billing not configured. Set POLAR_ACCESS_TOKEN + POLAR_PRODUCT_ID for reliable customer linking (recommended), or set POLAR_CHECKOUT_URL as fallback.',
      code: apiCheckoutError ? 'CHECKOUT_CREATE_FAILED' : 'BILLING_NOT_CONFIGURED',
      missing,
      apiCheckoutError,
      envHint,
    },
    { status: apiCheckoutError ? 500 : 503 }
  );
}
