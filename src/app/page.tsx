'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Recipe } from '@/types/recipe';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRecipeCache } from '@/hooks/useRecipeCache';
import { useLanguage } from '@/i18n/LanguageContext';
import { IngredientInput } from '@/components/IngredientInput';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeModal } from '@/components/RecipeModal';
import { BookmarkedRecipes } from '@/components/BookmarkedRecipes';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SearchHistory } from '@/components/SearchHistory';

const MAX_HISTORY = 20;

function normalizeIngredients(ingredients: string[]): string[] {
  return [...ingredients].map(i => i.toLowerCase().trim()).sort();
}

function areIngredientsEqual(a: string[], b: string[]): boolean {
  const normA = normalizeIngredients(a);
  const normB = normalizeIngredients(b);
  return normA.length === normB.length && normA.every((v, i) => v === normB[i]);
}

export default function Home() {
  const { language, t } = useLanguage();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasFromCache, setWasFromCache] = useState(false);

  const [bookmarks, setBookmarks, isHydrated] = useLocalStorage<Recipe[]>('recipe-bookmarks', []);
  const [generateImages, setGenerateImages] = useLocalStorage<boolean>('generate-images', false);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[][]>('search-history', []);
  const { getCachedRecipes, setCachedRecipes } = useRecipeCache();

  const addToHistory = useCallback((newIngredients: string[]) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => !areIngredientsEqual(h, newIngredients));
      const updated = [newIngredients, ...filtered].slice(0, MAX_HISTORY);
      return updated;
    });
  }, [setSearchHistory]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, [setSearchHistory]);

  const loadFromHistory = useCallback((historyIngredients: string[]) => {
    setIngredients(historyIngredients);
    setRecipes([]);
    setError(null);
    setWasFromCache(false);
  }, []);

  const addIngredient = useCallback((ingredient: string) => {
    setIngredients(prev => [...prev, ingredient]);
    setError(null);
  }, []);

  const removeIngredient = useCallback((ingredient: string) => {
    setIngredients(prev => prev.filter(i => i !== ingredient));
  }, []);

  const clearIngredients = useCallback(() => {
    setIngredients([]);
    setRecipes([]);
    setError(null);
    setWasFromCache(false);
  }, []);

  const toggleBookmark = useCallback((recipe: Recipe) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.id === recipe.id);
      if (exists) {
        return prev.filter(b => b.id !== recipe.id);
      }
      return [...prev, recipe];
    });
  }, [setBookmarks]);

  const isBookmarked = useCallback((recipeId: string) => {
    return bookmarks.some(b => b.id === recipeId);
  }, [bookmarks]);

  const fetchRecipes = async () => {
    if (ingredients.length === 0) {
      setError(t.errors.noIngredients);
      return;
    }

    const cacheKey = `${language}:${generateImages ? 'img' : 'noimg'}`;
    const cached = getCachedRecipes(ingredients, cacheKey);
    if (cached) {
      setRecipes(cached);
      setWasFromCache(true);
      setError(null);
      addToHistory([...ingredients]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setWasFromCache(false);

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, language, generateImages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.errors.fetchFailed);
      }

      setRecipes(data.recipes);
      setCachedRecipes(ingredients, cacheKey, data.recipes);
      addToHistory([...ingredients]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.fetchFailed);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-end gap-4 mb-6">
          {isHydrated && bookmarks.length > 0 && (
            <Link
              href="/bookmarks"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {t.viewBookmarks} ({bookmarks.length})
            </Link>
          )}
          <LanguageSwitcher />
        </div>

        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t.appTitle}</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {t.appSubtitle}
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <IngredientInput
            ingredients={ingredients}
            onAdd={addIngredient}
            onRemove={removeIngredient}
            disabled={isLoading}
          />

          <div className="flex items-center gap-3 mt-6">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateImages}
                onChange={(e) => setGenerateImages(e.target.checked)}
                disabled={isLoading}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-2 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">{t.generateImages}</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={fetchRecipes}
              disabled={isLoading || ingredients.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {isHydrated && (
            <SearchHistory
              history={searchHistory}
              onSelect={loadFromHistory}
              onClear={clearHistory}
            />
          )}
        </section>

        {recipes.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {t.recipeSuggestions}
              </h2>
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
                  onToggleBookmark={toggleBookmark}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
          </section>
        )}

        {isHydrated && (
          <BookmarkedRecipes
            bookmarks={bookmarks}
            onToggleBookmark={toggleBookmark}
            onSelectRecipe={setSelectedRecipe}
          />
        )}
      </div>

      <RecipeModal
        recipe={selectedRecipe}
        isBookmarked={selectedRecipe ? isBookmarked(selectedRecipe.id) : false}
        onClose={() => setSelectedRecipe(null)}
        onToggleBookmark={toggleBookmark}
      />
    </main>
  );
}
