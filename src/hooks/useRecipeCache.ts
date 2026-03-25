'use client';

import { useCallback } from 'react';
import { Recipe } from '@/types/recipe';

const CACHE_KEY = 'recipe-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  recipes: Recipe[];
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

function normalizeIngredients(ingredients: string[], language: string): string {
  const ingredientKey = ingredients
    .map(i => i.toLowerCase().trim())
    .sort()
    .join('|');
  return `${language}:${ingredientKey}`;
}

export function useRecipeCache() {
  const getCache = useCallback((): CacheStore => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }, []);

  const getCachedRecipes = useCallback((ingredients: string[], language: string): Recipe[] | null => {
    const key = normalizeIngredients(ingredients, language);
    const cache = getCache();
    const entry = cache[key];

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      const newCache = { ...cache };
      delete newCache[key];
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      return null;
    }

    return entry.recipes;
  }, [getCache]);

  const setCachedRecipes = useCallback((ingredients: string[], language: string, recipes: Recipe[]) => {
    const key = normalizeIngredients(ingredients, language);
    const cache = getCache();
    
    cache[key] = {
      recipes,
      timestamp: Date.now(),
    };

    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const sorted = keys
        .map(k => ({ key: k, timestamp: cache[k].timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      sorted.slice(0, keys.length - 50).forEach(({ key: k }) => {
        delete cache[k];
      });
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, [getCache]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return { getCachedRecipes, setCachedRecipes, clearCache };
}
