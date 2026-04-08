const MAX_HISTORY = 20;

export function normalizeIngredients(ingredients: string[]): string[] {
  return [...ingredients].map((i) => i.toLowerCase().trim()).sort();
}

export function areIngredientsEqual(a: string[], b: string[]): boolean {
  const normA = normalizeIngredients(a);
  const normB = normalizeIngredients(b);
  return normA.length === normB.length && normA.every((v, i) => v === normB[i]);
}

export function mergeHistoryEntry(
  prev: string[][],
  newIngredients: string[]
): string[][] {
  const filtered = prev.filter((h) => !areIngredientsEqual(h, newIngredients));
  return [newIngredients, ...filtered].slice(0, MAX_HISTORY);
}

export { MAX_HISTORY };
