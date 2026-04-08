import type { Translations } from '@/i18n/translations';

export type SupabaseOAuthUrlError = {
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

/** Supabase puts these in the query string or hash when verify fails before redirecting with ?code=. */
export function readSupabaseOAuthErrorFromUrl(url: URL): SupabaseOAuthUrlError | null {
  const q = url.searchParams;
  let error = q.get('error');
  let errorCode = q.get('error_code');
  let errorDescription = q.get('error_description');

  if (!error && !errorCode && url.hash.length > 1) {
    const hp = new URLSearchParams(url.hash.slice(1));
    error = hp.get('error');
    errorCode = hp.get('error_code');
    errorDescription = hp.get('error_description') ?? errorDescription;
  }

  if (!error && !errorCode) return null;
  return { error, errorCode, errorDescription };
}

export function messageForSupabaseOAuthError(
  err: SupabaseOAuthUrlError,
  t: Translations
): string {
  if (err.errorDescription) {
    try {
      return decodeURIComponent(err.errorDescription.replace(/\+/g, ' '));
    } catch {
      return err.errorDescription;
    }
  }
  if (err.errorCode === 'otp_expired') return t.errors.magicLinkExpired;
  return t.errors.magicLinkFailed;
}

/** Site URL sometimes receives ?code= instead of /auth/callback — forward so PKCE exchange runs. */
export function shouldForwardAuthCodeFromRoot(url: URL): boolean {
  const code = url.searchParams.get('code');
  return url.pathname === '/' && Boolean(code) && !url.searchParams.get('error');
}
