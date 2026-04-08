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

  const polar = getPolarClient();
  const productId = getPolarProductId();
  if (!polar || !productId) {
    const missing: string[] = [];
    if (!process.env.POLAR_ACCESS_TOKEN?.trim()) missing.push('POLAR_ACCESS_TOKEN');
    if (!productId) missing.push('POLAR_PRODUCT_ID');
    return NextResponse.json(
      {
        error:
          'Billing not configured. Either set POLAR_CHECKOUT_URL (Polar share link — no API keys) or POLAR_ACCESS_TOKEN + POLAR_PRODUCT_ID (Polar → Settings → API / Products). For sandbox API, set POLAR_SERVER=sandbox.',
        code: 'BILLING_NOT_CONFIGURED',
        missing,
      },
      { status: 503 }
    );
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl,
      returnUrl,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    console.error('Polar checkout:', e);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
