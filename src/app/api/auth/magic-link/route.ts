import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/app-url';

const e2e =
  process.env.E2E_TEST === '1' || process.env.NEXT_PUBLIC_E2E_TEST === '1';

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Proxies magic-link signup to Supabase from the server so mobile browsers only call same-origin
 * (avoids many "Load failed" / blocked requests to *.supabase.co).
 */
export async function POST(request: Request) {
  if (e2e) {
    return NextResponse.json({ error: 'Sign-in is disabled in this environment.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
      { status: 503 }
    );
  }

  const siteOrigin = resolvePublicOrigin(request);
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      if (new URL(originHeader).origin !== siteOrigin) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  } else {
    const referer = request.headers.get('referer');
    if (referer && !referer.startsWith(siteOrigin)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String((body as { email: unknown }).email ?? '').trim()
      : '';
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  let jsonResponse = NextResponse.json({ ok: true as const });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          jsonResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteOrigin}/auth/callback?next=/`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return jsonResponse;
}
