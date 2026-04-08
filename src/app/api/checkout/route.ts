import { type NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolvePublicBaseUrl } from '@/lib/app-url';
import { getPolarClient, getPolarProductId } from '@/lib/polar';

/** Optional: Polar dashboard checkout link when API credentials are not used. */
function fallbackCheckoutUrl(raw: string, user: { id: string; email?: string | null }): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.searchParams.set('external_customer_id', user.id);
    if (user.email) u.searchParams.set('customer_email', user.email);
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

  const polar = getPolarClient();
  const productId = getPolarProductId();
  const base = resolvePublicBaseUrl(request);
  const successUrl = `${base}/?checkout=success`;
  const returnUrl = base;

  const staticCheckout = process.env.POLAR_CHECKOUT_URL;
  if (!polar || !productId) {
    if (staticCheckout) {
      const url = fallbackCheckoutUrl(staticCheckout, user);
      if (url) {
        return NextResponse.json({ url });
      }
    }
    const missing: string[] = [];
    if (!process.env.POLAR_ACCESS_TOKEN?.trim()) missing.push('POLAR_ACCESS_TOKEN');
    if (!productId) missing.push('POLAR_PRODUCT_ID');
    return NextResponse.json(
      {
        error: 'Billing not configured. Add POLAR_ACCESS_TOKEN and POLAR_PRODUCT_ID to .env.local (Polar dashboard → Settings → API / Products). For sandbox, set POLAR_SERVER=sandbox. Optional: POLAR_CHECKOUT_URL for a shareable checkout link.',
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
