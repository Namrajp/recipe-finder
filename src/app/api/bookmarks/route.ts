import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import type { Recipe } from '@/types/recipe';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookmarks')
    .select('recipe')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookmarks = (data ?? []).map((row) => row.recipe as Recipe);
  return NextResponse.json({ bookmarks });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Recipe;
  try {
    body = (await request.json()) as Recipe;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.id || !body.title) {
    return NextResponse.json({ error: 'Invalid recipe' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('bookmarks').upsert(
    {
      user_id: user.id,
      recipe_id: body.id,
      recipe: body,
    },
    { onConflict: 'user_id,recipe_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get('recipeId');
  if (!recipeId) {
    return NextResponse.json({ error: 'recipeId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
