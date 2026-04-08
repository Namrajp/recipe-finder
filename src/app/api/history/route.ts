import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { mergeHistoryEntry, MAX_HISTORY } from '@/lib/history-utils';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('search_history')
    .select('ingredients, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const history = (data ?? []).map((row) => row.ingredients as string[]);
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let ingredients: string[];
  try {
    const body = (await request.json()) as { ingredients?: string[] };
    ingredients = body.ingredients ?? [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'ingredients required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from('search_history')
    .select('ingredients, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY);

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const prev = (existing ?? []).map((row) => row.ingredients as string[]);
  const merged = mergeHistoryEntry(prev, ingredients);

  const { error: delError } = await supabase.from('search_history').delete().eq('user_id', user.id);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const rows = merged.map((ing, i) => ({
    user_id: user.id,
    ingredients: ing,
    created_at: new Date(Date.now() - i * 1000).toISOString(),
  }));

  const { error: insError } = await supabase.from('search_history').insert(rows);
  if (insError) {
    return NextResponse.json({ error: insError.message }, { status: 500 });
  }

  return NextResponse.json({ history: merged });
}
