# Recipe Finder

An AI-powered recipe suggestion app that generates recipes based on the ingredients you have available.

## Features

- **Ingredient Input**: Add ingredients as tags by typing and pressing Enter
- **AI Recipe Generation**: Uses OpenAI GPT-4o-mini to generate 4 relevant recipes
- **Structured Responses**: Recipes include title, description, cook time, difficulty, ingredients, and step-by-step instructions
- **Recipe Cards**: Clean card layout showing recipe previews
- **Detail Modal**: Click any recipe to see full ingredients and instructions
- **Bookmarking**: Save favorite recipes to localStorage
- **Response Caching**: Same ingredient combinations return cached results (24-hour TTL)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```
OPENAI_API_KEY=your-api-key-here
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI API with structured outputs (JSON Schema)
- **Storage**: localStorage for bookmarks and response caching

## Project Structure

```
src/
├── app/
│   ├── api/recipes/route.ts   # Server-side API endpoint
│   ├── globals.css            # Tailwind styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   ├── IngredientInput.tsx    # Tag-based ingredient input
│   ├── RecipeCard.tsx         # Recipe preview card
│   ├── RecipeModal.tsx        # Full recipe detail modal
│   └── BookmarkedRecipes.tsx  # Saved recipes section
├── hooks/
│   ├── useLocalStorage.ts     # localStorage hook with hydration
│   └── useRecipeCache.ts      # Response caching hook
└── types/
    └── recipe.ts              # TypeScript interfaces
```

## API Security

The OpenAI API key is only used server-side in the `/api/recipes` route. It is never exposed to the browser.

## Caching

Recipe responses are cached in localStorage with a 24-hour TTL. The cache:
- Normalizes ingredient order (alphabetical) for consistent keys
- Limits stored entries to 50 to prevent unbounded growth
- Shows a "From cache" indicator when returning cached results
