import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { getFreeSearchLimit } from '@/lib/polar';
import { fetchPolarProStateForUser } from '@/lib/subscription-state';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let usedSearches = 0;
  try {
    const service = createServiceClient();
    const { data } = await service
      .from('usage')
      .select('recipe_search_count')
      .eq('user_id', user.id)
      .maybeSingle();
    usedSearches = data?.recipe_search_count ?? 0;
  } catch {
    usedSearches = 0;
  }

  const polar = await fetchPolarProStateForUser({ id: user.id, email: user.email });
  const limit = getFreeSearchLimit();

  return NextResponse.json(
    {
      isPro: polar.isPro,
      cancelAtPeriodEnd: polar.cancelAtPeriodEnd,
      currentPeriodEnd: polar.currentPeriodEnd,
      usedSearches,
      limit,
      resolvedBy: polar.resolvedBy,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}
