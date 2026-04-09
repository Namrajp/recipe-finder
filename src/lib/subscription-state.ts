import { getPolarClient, getPolarProductId } from '@/lib/polar';

export type PolarProState = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
  resolvedBy: 'external_id' | 'email' | 'none';
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
      resolvedBy: 'none',
    };
  }

  const productId = getPolarProductId();
  const emptyState: PolarProState = {
    isPro: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    subscriptionId: null,
    resolvedBy: 'none',
  };

  const toProState = (state: {
    type: string;
    activeSubscriptions: Array<{
      status: string;
      productId?: string | null;
      cancelAtPeriodEnd?: boolean | null;
      currentPeriodEnd?: unknown;
      id: string;
    }>;
  }): PolarProState => {
    if (state.type !== 'individual') return emptyState;
    const active = state.activeSubscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing'
    );
    if (active.length === 0) return emptyState;

    // Prefer configured product match, but gracefully fall back to any active/trialing subscription.
    const matched = productId ? active.find((s) => s.productId === productId) ?? active[0] : active[0];
    return {
      isPro: true,
      cancelAtPeriodEnd: Boolean(matched.cancelAtPeriodEnd),
      currentPeriodEnd: periodEndToIso(matched.currentPeriodEnd),
      subscriptionId: matched.id,
      resolvedBy: 'external_id',
    };
  };

  try {
    const stateExternal = await polar.customers.getStateExternal({ externalId });
    const externalResolved = toProState(stateExternal);
    if (externalResolved.isPro) {
      return externalResolved;
    }
  } catch {
    // Fall back below (e.g. customer external ID not linked in hosted checkout flow).
  }

  return emptyState;
}

export async function fetchPolarProStateForUser(user: {
  id: string;
  email?: string | null;
}): Promise<PolarProState> {
  const byExternal = await fetchPolarProState(user.id);
  if (byExternal.isPro) return byExternal;

  if (!user.email) return byExternal;

  const polar = getPolarClient();
  if (!polar) return byExternal;

  try {
    const list = await polar.customers.list({ email: user.email, limit: 1 });
    const firstPage = await list.next();
    if (!firstPage) return byExternal;
    const customer = firstPage.result.items[0];
    if (!customer?.id) return byExternal;

    const stateById = await polar.customers.getState({ id: customer.id });
    if (stateById.type !== 'individual') return byExternal;

    const productId = getPolarProductId();
    const active = stateById.activeSubscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing'
    );
    if (active.length === 0) return byExternal;
    const matched = productId ? active.find((s) => s.productId === productId) ?? active[0] : active[0];

    return {
      isPro: true,
      cancelAtPeriodEnd: Boolean(matched.cancelAtPeriodEnd),
      currentPeriodEnd: periodEndToIso(matched.currentPeriodEnd),
      subscriptionId: matched.id,
      resolvedBy: 'email',
    };
  } catch {
    return byExternal;
  }
}
