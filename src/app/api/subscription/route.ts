import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { getFreeSearchLimit } from '@/lib/polar';
import { fetchPolarProState } from '@/lib/subscription-state';

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

  const polar = await fetchPolarProState(user.id);
  const limit = getFreeSearchLimit();

  return NextResponse.json(
    {
      isPro: polar.isPro,
      cancelAtPeriodEnd: polar.cancelAtPeriodEnd,
      currentPeriodEnd: polar.currentPeriodEnd,
      usedSearches,
      limit,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}
