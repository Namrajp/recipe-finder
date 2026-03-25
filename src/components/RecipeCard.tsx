'use client';

import { Recipe } from '@/types/recipe';
import { useLanguage } from '@/i18n/LanguageContext';

interface RecipeCardProps {
  recipe: Recipe;
  isBookmarked: boolean;
  onToggleBookmark: (recipe: Recipe) => void;
  onClick: () => void;
}

const difficultyColors = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

export function RecipeCard({ 
  recipe, 
  isBookmarked, 
  onToggleBookmark, 
  onClick 
}: RecipeCardProps) {
  const { t } = useLanguage();
  
  const difficultyLabel = t.difficulty[recipe.difficulty];

  return (
    <article
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(recipe);
          }}
          className={`
            p-2 rounded-full transition-all duration-200
            ${isBookmarked 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'bg-white/80 text-gray-400 hover:bg-white hover:text-orange-500 shadow-sm backdrop-blur-sm'
            }
          `}
          aria-label={isBookmarked ? t.removeBookmark : t.addBookmark}
        >
          <svg 
            className="w-5 h-5" 
            fill={isBookmarked ? 'currentColor' : 'none'} 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
            />
          </svg>
        </button>
      </div>

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
          <svg className="w-16 h-16 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyColors[recipe.difficulty]}`}>
            {difficultyLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipe.cookTime}
          </span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
          {recipe.title}
        </h3>

        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          {recipe.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {recipe.ingredients.length} {t.ingredientsCount}
          </span>
          <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700 inline-flex items-center gap-1">
            {t.viewRecipe}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
