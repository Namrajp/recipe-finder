'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { useLanguage } from '@/i18n/LanguageContext';
import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import {
  messageForSupabaseOAuthError,
  readSupabaseOAuthErrorFromUrl,
  shouldForwardAuthCodeFromRoot,
} from '@/lib/supabase/oauth-return';
import { LoginModal } from '@/components/LoginModal';

type AuthContextValue = {
  user: User | null;
  e2eUser: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readE2EUser(): User | null {
  if (typeof window === 'undefined') return null;
  const u = window.__user;
  if (!u?.id || !u?.email) return null;
  return { id: u.id, email: u.email } as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [e2eUser, setE2eUser] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authUrlError, setAuthUrlError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NEXT_PUBLIC_E2E_TEST === '1') return;

    const url = new URL(window.location.href);
    if (shouldForwardAuthCodeFromRoot(url)) {
      window.location.replace(`/auth/callback${url.search}`);
      return;
    }

    const oauthErr = readSupabaseOAuthErrorFromUrl(url);
    if (oauthErr) {
      window.history.replaceState(null, '', url.pathname || '/');
      setAuthUrlError(messageForSupabaseOAuthError(oauthErr, t));
      setLoginModalOpen(true);
    }
  }, [t]);

  useLayoutEffect(() => {
    const e2e = readE2EUser();
    if (e2e) {
      setUser(e2e);
      setE2eUser(true);
      setLoading(false);
      return;
    }

    if (process.env.NEXT_PUBLIC_E2E_TEST === '1') {
      setUser(null);
      setE2eUser(false);
      setLoading(false);
      return;
    }

    if (!isSupabaseBrowserConfigured()) {
      setUser(null);
      setE2eUser(false);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (e2eUser) {
      setUser(null);
      setE2eUser(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_E2E_TEST === '1') {
      setUser(null);
      return;
    }
    if (!isSupabaseBrowserConfigured()) {
      setUser(null);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, [e2eUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      e2eUser,
      loading,
      signOut,
      loginModalOpen,
      openLoginModal: () => setLoginModalOpen(true),
      closeLoginModal: () => setLoginModalOpen(false),
    }),
    [user, e2eUser, loading, signOut, loginModalOpen]
  );

  return (
    <AuthContext.Provider value={value}>
      <span data-auth-ready={!loading ? 'true' : 'false'} className="hidden" aria-hidden />
      {children}
      <LoginModal
        open={loginModalOpen}
        onClose={() => {
          setAuthUrlError(null);
          setLoginModalOpen(false);
        }}
        urlAuthError={authUrlError}
        onClearUrlAuthError={() => setAuthUrlError(null)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
