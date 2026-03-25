'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

interface IngredientInputProps {
  ingredients: string[];
  onAdd: (ingredient: string) => void;
  onRemove: (ingredient: string) => void;
  disabled?: boolean;
}

export function IngredientInput({ 
  ingredients, 
  onAdd, 
  onRemove, 
  disabled 
}: IngredientInputProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addIngredient();
    } else if (e.key === 'Backspace' && inputValue === '' && ingredients.length > 0) {
      onRemove(ingredients[ingredients.length - 1]);
    }
  };

  const addIngredient = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addIngredient();
    }
  };

  return (
    <div className="w-full">
      <label 
        htmlFor="ingredient-input" 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {t.ingredientLabel}
      </label>
      <div 
        className={`
          flex flex-wrap gap-2 p-3 min-h-[56px] bg-white border-2 rounded-xl
          transition-colors cursor-text
          ${disabled ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100'}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {ingredients.map((ingredient) => (
          <span
            key={ingredient}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-800'}
            `}
          >
            {ingredient}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(ingredient);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors"
                aria-label={`Remove ${ingredient}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id="ingredient-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={ingredients.length === 0 ? t.ingredientPlaceholder : t.ingredientPlaceholderMore}
          className="flex-1 min-w-[150px] outline-none bg-transparent text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {t.ingredientHint}
      </p>
    </div>
  );
}
