'use client';

import { useState, useEffect, FormEvent } from 'react';
import { isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  /** Set when Supabase redirects with ?error= / otp_expired on the home URL */
  urlAuthError?: string | null;
  onClearUrlAuthError?: () => void;
};

export function LoginModal({ open, onClose, urlAuthError, onClearUrlAuthError }: LoginModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlAuthError) setSent(false);
  }, [urlAuthError]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    onClearUrlAuthError?.();
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_E2E_TEST === '1') {
        setError('Sign-in is disabled in this environment.');
        return;
      }
      if (!isSupabaseBrowserConfigured()) {
        setError(t.errors.authNotConfigured);
        return;
      }
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t.errors.signInNetworkFailed);
        return;
      }
      setSent(true);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('signInWithOtp failed', err);
      }
      const msg = err instanceof Error ? err.message : String(err);
      const networkLike =
        err instanceof TypeError ||
        !msg ||
        /failed to fetch|load failed|network|aborted|timeout|internet|not connected/i.test(msg);
      setError(networkLike ? t.errors.signInNetworkFailed : `${t.errors.signInFailed} ${msg}`.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <h2 id="login-modal-title" className="text-xl font-bold text-gray-900">
            {t.signInTitle}
          </h2>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail('');
              setError(null);
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={t.close}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <p className="text-gray-600 text-sm">{t.checkEmail}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {urlAuthError ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {urlAuthError}
              </p>
            ) : null}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t.emailLabel}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? t.sendingLink : t.sendMagicLink}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
