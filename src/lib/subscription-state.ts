import { getPolarClient, getPolarProductId } from '@/lib/polar';

export type PolarProState = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
};

function periodEndToIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  const maybe = value as { toISOString?: () => string };
  return typeof maybe.toISOString === 'function' ? maybe.toISOString() ?? null : null;
}

export async function fetchPolarProState(externalId: string): Promise<PolarProState> {
  const polar = getPolarClient();
  if (!polar) {
    return {
      isPro: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      subscriptionId: null,
    };
  }

  const productId = getPolarProductId();

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
    const active = state.activeSubscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing'
    );
    const match = productId ? active.filter((s) => s.productId === productId) : active;
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
      cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
      currentPeriodEnd: periodEndToIso(sub.currentPeriodEnd),
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
