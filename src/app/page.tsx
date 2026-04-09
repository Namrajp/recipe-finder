'use client';

import { useState, useCallback, useEffect } from 'react';
import { Recipe } from '@/types/recipe';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/components/AuthProvider';
import { AppNavWithBookmarksLink } from '@/components/AppNav';
import { fetchSubscriptionApi } from '@/lib/subscription-client';
import { IngredientInput } from '@/components/IngredientInput';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeModal } from '@/components/RecipeModal';
import { BookmarkedRecipes } from '@/components/BookmarkedRecipes';
import { SearchHistory } from '@/components/SearchHistory';

type SubscriptionInfo = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  usedSearches: number;
  limit: number;
};

const CHECKOUT_PENDING_KEY = 'checkout_pending_at';
const CHECKOUT_PENDING_TTL_MS = 30 * 60 * 1000;

export default function Home() {
  const { language, t } = useLanguage();
  const { user, loading: authLoading, openLoginModal } = useAuth();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasFromCache, setWasFromCache] = useState(false);
  const [bookmarks, setBookmarks] = useState<Recipe[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[][]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [generateImagesVal, setGenerateImagesVal] = useLocalStorage<boolean>('generate-images', false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setSearchHistory([]);
      setSubscription(null);
      setDataReady(true);
      return;
    }
    setDataReady(false);
    try {
      const [bmRes, histRes, sub] = await Promise.all([
        fetch('/api/bookmarks'),
        fetch('/api/history'),
        fetchSubscriptionApi(),
      ]);
      if (bmRes.ok) {
        const j = await bmRes.json();
        setBookmarks(j.bookmarks ?? []);
      }
      if (histRes.ok) {
        const j = await histRes.json();
        setSearchHistory(j.history ?? []);
      }
      setSubscription(sub);
    } finally {
      setDataReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadUserData();
  }, [authLoading, loadUserData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const paidFromParams =
      params.get('checkout') === 'success' ||
      params.get('success') === 'true' ||
      params.get('success') === '1' ||
      params.get('payment_status') === 'success' ||
      params.get('status') === 'success';
    const pendingCheckoutAt = Number(window.sessionStorage.getItem(CHECKOUT_PENDING_KEY) || 0);
    const hasRecentCheckoutPending =
      Number.isFinite(pendingCheckoutAt) && pendingCheckoutAt > 0 && Date.now() - pendingCheckoutAt < CHECKOUT_PENDING_TTL_MS;
    const shouldPollCheckout = paidFromParams || hasRecentCheckoutPending;

    if (params.get('auth') === 'error') {
      window.history.replaceState({}, '', '/');
    }

    if (!shouldPollCheckout) return undefined;

    if (!user) {
      return undefined;
    }

    if (paidFromParams) {
      window.history.replaceState({}, '', '/');
    }

    let cancelled = false;
    const pollAfterCheckout = async () => {
      const scheduleMs = [0, 1500, 3500, 7000, 12000];
      let prev = 0;
      for (const target of scheduleMs) {
        if (cancelled) return;
        const delta = target - prev;
        if (delta > 0) {
          await new Promise((r) => setTimeout(r, delta));
        }
        prev = target;
        const sub = await fetchSubscriptionApi();
        if (sub) {
          setSubscription(sub);
          if (sub.isPro) {
            window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
            break;
          }
        }
      }
      window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
      if (!cancelled) {
        await loadUserData();
      }
    };
    void pollAfterCheckout();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, loadUserData]);

  useEffect(() => {
    if (subscription && !subscription.isPro && generateImagesVal) {
      setGenerateImagesVal(false);
    }
  }, [subscription, generateImagesVal, setGenerateImagesVal]);

  const refreshSubscription = useCallback(async () => {
    const sub = await fetchSubscriptionApi();
    if (sub) {
      setSubscription(sub);
    }
  }, []);

  const persistHistory = useCallback(async (newIngredients: string[]) => {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: newIngredients }),
    });
    if (res.ok) {
      const j = await res.json();
      setSearchHistory(j.history ?? []);
    }
  }, []);

  const loadFromHistory = useCallback((historyIngredients: string[]) => {
    setIngredients(historyIngredients);
    setRecipes([]);
    setError(null);
    setWasFromCache(false);
  }, []);

  const addIngredient = useCallback((ingredient: string) => {
    setIngredients((prev) => [...prev, ingredient]);
    setError(null);
  }, []);

  const removeIngredient = useCallback((ingredient: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ingredient));
  }, []);

  const clearIngredients = useCallback(() => {
    setIngredients([]);
    setRecipes([]);
    setError(null);
    setWasFromCache(false);
  }, []);

  const clearHistory = useCallback(async () => {
    const res = await fetch('/api/history/clear', { method: 'POST' });
    if (res.ok) {
      setSearchHistory([]);
    }
  }, []);

  const toggleBookmark = useCallback(
    async (recipe: Recipe) => {
      const exists = bookmarks.some((b) => b.id === recipe.id);
      if (exists) {
        const res = await fetch(`/api/bookmarks?recipeId=${encodeURIComponent(recipe.id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setBookmarks((prev) => prev.filter((b) => b.id !== recipe.id));
        }
      } else {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipe),
        });
        if (res.ok) {
          setBookmarks((prev) => [...prev, recipe]);
        }
      }
    },
    [bookmarks]
  );

  const isBookmarked = useCallback(
    (recipeId: string) => bookmarks.some((b) => b.id === recipeId),
    [bookmarks]
  );

  const startCheckout = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && j.url) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(CHECKOUT_PENDING_KEY, String(Date.now()));
        }
        window.location.href = j.url;
        return;
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
      }
      setError(j.error || t.errors.checkoutFailed);
    } catch {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
      }
      setError(t.errors.checkoutFailed);
    }
  }, [t.errors.checkoutFailed]);

  const handleManageSubscription = useCallback(async () => {
    if (!subscription?.isPro || subscription.cancelAtPeriodEnd) return;
    const res = await fetch('/api/subscription/cancel', { method: 'POST' });
    if (res.ok) {
      await refreshSubscription();
    }
  }, [subscription, refreshSubscription]);

  const fetchRecipes = async () => {
    if (ingredients.length === 0) {
      setError(t.errors.noIngredients);
      return;
    }
    if (!user) {
      openLoginModal();
      setError(t.authRequired);
      return;
    }

    setIsLoading(true);
    setError(null);
    setWasFromCache(false);

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          language,
          generateImages: generateImagesVal,
        }),
      });

      const data = await response.json();

      if (response.status === 402 && data.code === 'QUOTA_EXCEEDED') {
        setError(data.error || t.quotaExceededTitle);
        setRecipes([]);
        await refreshSubscription();
        return;
      }

      if (response.status === 402 && data.code === 'IMAGES_PRO_REQUIRED') {
        setError(data.error || t.imagesProRequired);
        setRecipes([]);
        await refreshSubscription();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || t.errors.fetchFailed);
      }

      setRecipes(data.recipes as Recipe[]);
      setWasFromCache(Boolean(data.cached));
      await persistHistory([...ingredients]);
      await refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.fetchFailed);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const usageLabelFree =
    subscription &&
    !subscription.isPro &&
    t.usageFree
      .replace('{used}', String(subscription.usedSearches))
      .replace('{limit}', String(subscription.limit));

  const imagesLocked = Boolean(subscription && !subscription.isPro);

  const showUpgrade =
    user &&
    subscription &&
    !subscription.isPro &&
    subscription.usedSearches >= subscription.limit;

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <AppNavWithBookmarksLink
          bookmarkCount={bookmarks.length}
          subscription={subscription ? { isPro: subscription.isPro, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : null}
          onManageSubscription={handleManageSubscription}
        />

        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t.appTitle}</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">{t.appSubtitle}</p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <IngredientInput
            ingredients={ingredients}
            onAdd={addIngredient}
            onRemove={removeIngredient}
            disabled={isLoading}
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-6">
            <label
              className={`inline-flex items-center gap-2 select-none ${
                imagesLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={!imagesLocked && generateImagesVal}
                onChange={(e) => setGenerateImagesVal(e.target.checked)}
                disabled={isLoading || imagesLocked}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-2 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">{t.generateImages}</span>
            </label>
            {imagesLocked && <span className="text-xs text-gray-500">{t.imagesProHint}</span>}
          </div>

          {showUpgrade && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-900">{t.quotaExceededTitle}</p>
                <p className="text-sm text-amber-800">{t.quotaExceededBody}</p>
              </div>
              <button
                type="button"
                onClick={() => void startCheckout()}
                className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600"
              >
                {t.upgrade}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => void fetchRecipes()}
              disabled={isLoading || ingredients.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t.findingRecipes}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {t.suggestRecipes}
                </>
              )}
            </button>

            {user && subscription && subscription.isPro && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm ring-1 ring-amber-400/30"
                aria-label={t.proUnlimited}
              >
                {t.proUnlimited}
              </span>
            )}
            {user && subscription && usageLabelFree && (
              <span className="text-sm text-gray-600 font-medium">{usageLabelFree}</span>
            )}

            {ingredients.length > 0 && (
              <button
                onClick={clearIngredients}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {dataReady && user && (
            <SearchHistory history={searchHistory} onSelect={loadFromHistory} onClear={() => void clearHistory()} />
          )}
        </section>

        {recipes.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t.recipeSuggestions}</h2>
              {wasFromCache && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t.fromCache}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isBookmarked={isBookmarked(recipe.id)}
                  onToggleBookmark={(r) => void toggleBookmark(r)}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
          </section>
        )}

        {dataReady && user && bookmarks.length > 0 && (
          <BookmarkedRecipes
            bookmarks={bookmarks}
            onToggleBookmark={(r) => void toggleBookmark(r)}
            onSelectRecipe={setSelectedRecipe}
          />
        )}
      </div>

      <RecipeModal
        recipe={selectedRecipe}
        isBookmarked={selectedRecipe ? isBookmarked(selectedRecipe.id) : false}
        onClose={() => setSelectedRecipe(null)}
        onToggleBookmark={(r) => void toggleBookmark(r)}
      />
    </main>
  );
}
