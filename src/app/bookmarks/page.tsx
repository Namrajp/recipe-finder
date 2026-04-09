'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Recipe } from '@/types/recipe';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/components/AuthProvider';
import { AppNav } from '@/components/AppNav';
import { fetchSubscriptionApi } from '@/lib/subscription-client';
import { RecipeModal } from '@/components/RecipeModal';

const difficultyColors = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

type SubscriptionInfo = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
};

export default function BookmarksPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const loadBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bmRes, sub] = await Promise.all([fetch('/api/bookmarks'), fetchSubscriptionApi()]);
      if (bmRes.ok) {
        const j = await bmRes.json();
        setBookmarks(j.bookmarks ?? []);
      }
      setSubscription(
        sub
          ? {
              isPro: sub.isPro,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }
          : null
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadBookmarks();
  }, [authLoading, loadBookmarks]);

  const refreshSubscription = useCallback(async () => {
    const sub = await fetchSubscriptionApi();
    if (sub) {
      setSubscription({
        isPro: sub.isPro,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      });
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    if (!subscription?.isPro || subscription.cancelAtPeriodEnd) return;
    const res = await fetch('/api/subscription/cancel', { method: 'POST' });
    if (res.ok) {
      await refreshSubscription();
    }
  }, [subscription, refreshSubscription]);

  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  useEffect(() => {
    if (loading || !user || !subscription?.isPro) return;
    const recipesWithoutImages = bookmarksRef.current.filter((r) => !r.imageUrl);
    if (recipesWithoutImages.length === 0) return;

    let cancelled = false;

    void (async () => {
      for (const recipe of recipesWithoutImages) {
        if (cancelled) break;
        setGeneratingImages((prev) => new Set(prev).add(recipe.id));
        try {
          const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: recipe.title, description: recipe.description }),
          });
          if (response.ok) {
            const data = await response.json();
            const updated = { ...recipe, imageUrl: data.imageUrl as string };
            setBookmarks((prev) => prev.map((r) => (r.id === recipe.id ? updated : r)));
            await fetch('/api/bookmarks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            });
          }
        } catch (error) {
          console.error(`Failed to generate image for ${recipe.title}:`, error);
        } finally {
          setGeneratingImages((prev) => {
            const next = new Set(prev);
            next.delete(recipe.id);
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, subscription?.isPro, user]);

  const removeBookmark = useCallback(async (recipeId: string) => {
    const res = await fetch(`/api/bookmarks?recipeId=${encodeURIComponent(recipeId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setBookmarks((prev) => prev.filter((r) => r.id !== recipeId));
    }
  }, []);

  const clearAllBookmarks = useCallback(async () => {
    const snapshot = [...bookmarks];
    for (const r of snapshot) {
      const res = await fetch(`/api/bookmarks?recipeId=${encodeURIComponent(r.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        await loadBookmarks();
        return;
      }
    }
    setBookmarks([]);
  }, [bookmarks, loadBookmarks]);

  const toggleBookmark = useCallback(
    async (recipe: Recipe) => {
      await removeBookmark(recipe.id);
    },
    [removeBookmark]
  );

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-80" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <AppNav />
          <div className="text-center py-16">
            <p className="text-gray-600 mb-4">{t.authRequired}</p>
            <Link href="/" className="text-orange-600 font-medium hover:underline">
              {t.backToHome}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-end mb-6">
          <AppNav subscription={subscription ?? undefined} onManageSubscription={() => void handleManageSubscription()} />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label={t.backToHome}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.savedRecipes}</h1>
              <p className="text-sm text-gray-500">
                {bookmarks.length} {bookmarks.length === 1 ? t.recipe : t.recipes}
              </p>
            </div>
          </div>

          {bookmarks.length > 0 && (
            <button
              type="button"
              onClick={() => void clearAllBookmarks()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t.clearAllBookmarks}
            </button>
          )}
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.noBookmarks}</h2>
            <p className="text-gray-500 mb-6">{t.noBookmarksDescription}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              {t.findRecipes}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((recipe) => (
              <article
                key={recipe.id}
                className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => void removeBookmark(recipe.id)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-gray-400 hover:bg-red-50 hover:text-red-500 shadow-sm transition-colors"
                  aria-label={t.removeBookmark}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="cursor-pointer" onClick={() => setSelectedRecipe(recipe)} role="presentation">
                  {recipe.imageUrl ? (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                      {generatingImages.has(recipe.id) ? (
                        <div className="text-center">
                          <svg className="animate-spin w-8 h-8 text-orange-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span className="text-sm text-orange-500">{t.generatingImage}</span>
                        </div>
                      ) : (
                        <svg className="w-16 h-16 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${difficultyColors[recipe.difficulty]}`}
                      >
                        {t.difficulty[recipe.difficulty]}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {recipe.cookTime}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {recipe.title}
                    </h3>

                    <p className="text-gray-600 text-sm line-clamp-2">{recipe.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <RecipeModal
        recipe={selectedRecipe}
        isBookmarked
        onClose={() => setSelectedRecipe(null)}
        onToggleBookmark={(r) => void toggleBookmark(r)}
      />
    </main>
  );
}
