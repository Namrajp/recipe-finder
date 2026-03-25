'use client';

import { useEffect, useCallback } from 'react';
import { Recipe } from '@/types/recipe';
import { useLanguage } from '@/i18n/LanguageContext';

interface RecipeModalProps {
  recipe: Recipe | null;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (recipe: Recipe) => void;
}

const difficultyColors = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

export function RecipeModal({ 
  recipe, 
  isBookmarked, 
  onClose, 
  onToggleBookmark 
}: RecipeModalProps) {
  const { t } = useLanguage();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (recipe) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [recipe, handleKeyDown]);

  if (!recipe) return null;

  const difficultyLabel = t.difficulty[recipe.difficulty];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
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
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
              {recipe.title}
            </h2>
            <p className="text-gray-600 mt-1">{recipe.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggleBookmark(recipe)}
              className={`
                p-2.5 rounded-full transition-all duration-200
                ${isBookmarked 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
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
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label={t.close}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {recipe.imageUrl && (
            <div className="w-full aspect-[2/1] overflow-hidden">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t.ingredients}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-gray-700">{ingredient}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {t.instructions}
            </h3>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li 
                  key={index}
                  className="flex gap-4"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 pt-1 leading-relaxed">{instruction}</p>
                </li>
              ))}
            </ol>
          </section>
          </div>
        </div>
      </div>
    </div>
  );
}
