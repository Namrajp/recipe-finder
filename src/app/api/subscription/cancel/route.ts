import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPolarClient } from '@/lib/polar';
import { fetchPolarProState } from '@/lib/subscription-state';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const polar = getPolarClient();
  if (!polar) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  }

  const state = await fetchPolarProState(user.id);
  if (!state.isPro || !state.subscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  try {
    await polar.subscriptions.update({
      id: state.subscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Polar cancel:', e);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
