'use client';

import { Recipe } from '@/types/recipe';
import { RecipeCard } from './RecipeCard';
import { useLanguage } from '@/i18n/LanguageContext';

interface BookmarkedRecipesProps {
  bookmarks: Recipe[];
  onToggleBookmark: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export function BookmarkedRecipes({ 
  bookmarks, 
  onToggleBookmark, 
  onSelectRecipe 
}: BookmarkedRecipesProps) {
  const { t } = useLanguage();

  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t.savedRecipes}</h2>
        <span className="text-sm text-gray-500">({bookmarks.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {bookmarks.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isBookmarked={true}
            onToggleBookmark={onToggleBookmark}
            onClick={() => onSelectRecipe(recipe)}
          />
        ))}
      </div>
    </section>
  );
}
