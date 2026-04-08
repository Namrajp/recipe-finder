import { getPolarClient, getPolarProductId } from '@/lib/polar';

export type PolarProState = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
};

export async function fetchPolarProState(externalId: string): Promise<PolarProState> {
  const polar = getPolarClient();
  const productId = getPolarProductId();
  if (!polar || !productId) {
    return {
      isPro: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      subscriptionId: null,
    };
  }

  try {
    const state = await polar.customers.getStateExternal({ externalId });
    if (state.type !== 'individual') {
      return {
        isPro: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        subscriptionId: null,
      };
    }
    const match = state.activeSubscriptions.filter(
      (s) =>
        s.productId === productId && (s.status === 'active' || s.status === 'trialing')
    );
    const sub = match[0];
    if (!sub) {
      return {
        isPro: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        subscriptionId: null,
      };
    }
    return {
      isPro: true,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString?.() ?? null,
      subscriptionId: sub.id,
    };
  } catch {
    return {
      isPro: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      subscriptionId: null,
    };
  }
}
