export type SubscriptionApiPayload = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  usedSearches: number;
  limit: number;
};

/** Client fetch; avoids cached responses after checkout or plan changes. */
export async function fetchSubscriptionApi(): Promise<SubscriptionApiPayload | null> {
  const res = await fetch('/api/subscription', { cache: 'no-store' });
  if (!res.ok) return null;
  const j = (await res.json()) as Record<string, unknown>;
  return {
    isPro: Boolean(j.isPro),
    cancelAtPeriodEnd: Boolean(j.cancelAtPeriodEnd),
    usedSearches: Number(j.usedSearches) || 0,
    limit: Number(j.limit) || 3,
  };
}
