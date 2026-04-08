export function buildRecipeCacheKey(
  ingredients: string[],
  language: string,
  generateImages: boolean
): string {
  const part = [...ingredients]
    .map((i) => i.toLowerCase().trim())
    .sort()
    .join('|');
  return `${language}:${generateImages ? 'img' : 'noimg'}:${part}`;
}
