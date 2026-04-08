import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/app-url';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteOrigin = resolvePublicOrigin(request);
  const code = url.searchParams.get('code');
  let next = url.searchParams.get('next') ?? '/';
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/';
  }

  const successRedirect = new URL(next, siteOrigin).toString();

  if (code) {
    const cookieStore = await cookies();
    const redirectResponse = NextResponse.redirect(successRedirect);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
  }

  return NextResponse.redirect(new URL('/?auth=error', siteOrigin));
}
