'use client';

import { useLanguage } from '@/i18n/LanguageContext';

interface SearchHistoryProps {
  history: string[][];
  onSelect: (ingredients: string[]) => void;
  onClear: () => void;
}

export function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  const { t } = useLanguage();

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">{t.recentSearches}</h3>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          {t.clearHistory}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((ingredients, index) => (
          <button
            key={index}
            onClick={() => onSelect(ingredients)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-full text-sm text-gray-700 hover:text-orange-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {ingredients.join(', ')}
          </button>
        ))}
      </div>
    </div>
  );
}
