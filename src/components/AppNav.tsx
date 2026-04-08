'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ProBadge } from '@/components/ProBadge';
import { useLanguage } from '@/i18n/LanguageContext';

type AppNavProps = {
  subscription?: {
    isPro: boolean;
    cancelAtPeriodEnd?: boolean;
  } | null;
  onManageSubscription?: () => void;
  /** When false, Pro badge is omitted (e.g. shown beside bookmarks on the home layout). */
  showProBadge?: boolean;
};

export function AppNav({ subscription, onManageSubscription, showProBadge = true }: AppNavProps) {
  const { t } = useLanguage();
  const { user, loading, signOut, openLoginModal } = useAuth();

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
      {showProBadge && subscription?.isPro && <ProBadge />}
      {user ? (
        <>
          <span className="text-sm text-gray-600 truncate max-w-[200px]" title={user.email ?? undefined}>
            {user.email}
          </span>
          {subscription?.isPro && onManageSubscription && (
            subscription.cancelAtPeriodEnd ? (
              <span className="text-sm text-gray-500">{t.subscriptionEnding}</span>
            ) : (
              <button
                type="button"
                onClick={onManageSubscription}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                {t.cancelSubscription}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            {t.signOut}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => openLoginModal()}
          disabled={loading}
          className="text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {t.signIn}
        </button>
      )}
      <LanguageSwitcher />
    </div>
  );
}

export function AppNavWithBookmarksLink({
  bookmarkCount,
  subscription,
  onManageSubscription,
}: AppNavProps & { bookmarkCount: number }) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {subscription?.isPro && <ProBadge />}
        {!loading && user && bookmarkCount > 0 && (
          <Link
            href="/bookmarks"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {t.viewBookmarks} ({bookmarkCount})
          </Link>
        )}
      </div>
      <AppNav
        subscription={subscription}
        onManageSubscription={onManageSubscription}
        showProBadge={false}
      />
    </div>
  );
}
