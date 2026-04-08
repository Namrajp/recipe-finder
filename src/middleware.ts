import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip magic-link API so PKCE cookies from POST are not merged with session refresh response.
    '/((?!_next/static|_next/image|favicon.ico|api/auth/magic-link|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
