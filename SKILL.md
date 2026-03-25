# Recipe Finder App - Project Skill

An AI-powered recipe suggestion application that generates recipes based on available ingredients, with optional image generation and multi-language support.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Add your OpenAI API key to .env.local

# Run development server
pnpm dev
```

## Architecture Overview

```
src/
├── app/
│   ├── api/
│   │   ├── recipes/route.ts      # Recipe generation endpoint (GPT-4o-mini)
│   │   └── generate-image/route.ts # Image generation endpoint (DALL-E 3)
│   ├── bookmarks/
│   │   └── page.tsx              # Dedicated bookmarks page
│   ├── layout.tsx                # Root layout with LanguageProvider
│   ├── page.tsx                  # Main page component
│   └── globals.css               # Tailwind styles
├── components/
│   ├── IngredientInput.tsx       # Tag-based ingredient input
│   ├── RecipeCard.tsx            # Recipe preview card with image
│   ├── RecipeModal.tsx           # Full recipe detail modal
│   ├── BookmarkedRecipes.tsx     # Saved recipes section
│   └── LanguageSwitcher.tsx      # EN/NE language toggle
├── hooks/
│   ├── useLocalStorage.ts        # Persistent state hook
│   └── useRecipeCache.ts         # Recipe response caching
├── i18n/
│   ├── translations.ts           # EN/NE translation strings
│   └── LanguageContext.tsx       # Language context provider
├── lib/
│   └── storage.ts                # Hybrid storage (local/Vercel Blob)
└── types/
    └── recipe.ts                 # TypeScript interfaces
```

## Key Features

### 1. Recipe Generation
- Uses OpenAI GPT-4o-mini with structured JSON output
- Returns exactly 4 recipes with: title, description, cookTime, difficulty, ingredients, instructions
- Supports English and Nepali language output

### 2. Image Generation (Optional)
- Uses DALL-E 3 for food photography style images
- Server-side caching in `public/recipe-images/`
- Filename: MD5 hash of recipe title
- Toggle via checkbox, preference saved to localStorage

### 3. Caching Strategy
- **Recipe Cache**: localStorage with 24-hour TTL, keyed by language + ingredients + image flag
- **Image Cache**: Server filesystem, persists indefinitely
- Cache key format: `{language}:{img|noimg}:{sorted-ingredients}`

### 4. Search History
- Stores last 20 ingredient combinations in localStorage
- Deduplicates entries (same ingredients = same entry)
- Clickable to re-run searches
- Clear history button
- Displayed below the input area

### 5. Internationalization
- Languages: English (en), Nepali (ne)
- All UI strings in `src/i18n/translations.ts`
- AI responses generated in selected language
- Preference persisted to localStorage

## API Endpoints

### POST /api/recipes
```typescript
// Request
{
  ingredients: string[],
  language: 'en' | 'ne',
  generateImages: boolean
}

// Response
{
  recipes: Recipe[],
  cached: boolean
}
```

### POST /api/generate-image
```typescript
// Request
{
  title: string,
  description: string
}

// Response
{
  imageUrl: string,
  cached: boolean
}
```

## Type Definitions

```typescript
interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
}
```

## Adding a New Language

1. Add language code to `src/i18n/translations.ts`:
```typescript
export const translations = {
  en: { ... },
  ne: { ... },
  // Add new language here
  es: {
    appTitle: 'Buscador de Recetas',
    // ... all other keys
  }
}
```

2. Update `LanguageSwitcher.tsx` with new language option

3. Add language instruction in `src/app/api/recipes/route.ts`:
```typescript
const languageInstructions: Record<string, string> = {
  en: 'Respond in English.',
  ne: 'Respond entirely in Nepali...',
  es: 'Respond entirely in Spanish...',
};
```

## Environment Variables

```env
OPENAI_API_KEY=sk-...  # Required for recipe and image generation
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI API (GPT-4o-mini, DALL-E 3)
- **State**: React hooks + localStorage

## Common Tasks

### Add a new UI string
1. Add key to both `en` and `ne` in `translations.ts`
2. Use via `const { t } = useLanguage(); t.yourNewKey`

### Modify recipe output format
1. Update schema in `src/app/api/recipes/route.ts`
2. Update `Recipe` interface in `src/types/recipe.ts`
3. Update components that display recipe data

### Change image generation prompt
Edit the prompt in `src/app/api/recipes/route.ts`:
```typescript
const prompt = `A professional food photography shot of ${title}...`;
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/recipe-finder.git
git push -u origin main
```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Set Environment Variables**
   In Vercel Dashboard > Settings > Environment Variables:
   - `OPENAI_API_KEY` = your OpenAI API key

4. **Create Blob Storage**
   - Go to Vercel Dashboard > Storage
   - Create a new Blob store
   - Connect it to your project
   - This auto-adds `BLOB_READ_WRITE_TOKEN`

5. **Deploy**
   - Click Deploy
   - Your app will be live at `your-project.vercel.app`

### Image Storage

The app uses a hybrid storage strategy:

| Environment | Storage | Location |
|-------------|---------|----------|
| Development | Local filesystem | `public/recipe-images/` |
| Production | Vercel Blob | Cloud (auto-CDN) |

The `src/lib/storage.ts` module handles this automatically based on `NODE_ENV`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini and DALL-E 3 |
| `BLOB_READ_WRITE_TOKEN` | Production only | Vercel Blob storage token (auto-set when connecting store) |

## Cost Considerations

- Recipe generation: ~$0.001 per request (GPT-4o-mini)
- Image generation: ~$0.04 per image (DALL-E 3)
- With 4 recipes + images: ~$0.16 per request when images enabled
- Vercel Blob: $0.15/GB stored, $0.30/GB bandwidth (generous free tier)
