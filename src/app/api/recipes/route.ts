import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Recipe } from '@/types/recipe';
import { getSessionUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { buildRecipeCacheKey } from '@/lib/recipe-cache-key';
import { generateImageHash, imageExists, saveImage } from '@/lib/storage';
import { getFreeSearchLimit } from '@/lib/polar';
import { fetchPolarProStateForUser } from '@/lib/subscription-state';

const CACHE_MS = 24 * 60 * 60 * 1000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateRecipeImage(
  client: OpenAI,
  title: string,
  description: string
): Promise<string | undefined> {
  const hash = generateImageHash(title);

  const existingUrl = await imageExists(hash);
  if (existingUrl) {
    return existingUrl;
  }

  try {
    const prompt = `A professional food photography shot of ${title}. ${description || ''}. Appetizing, well-lit, on a clean plate with elegant presentation. Top-down or 45-degree angle view. High quality, restaurant style.`;

    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    });

    const imageData = response.data?.[0]?.b64_json;

    if (imageData) {
      const buffer = Buffer.from(imageData, 'base64');
      const imageUrl = await saveImage(hash, buffer);
      return imageUrl;
    }
  } catch (error) {
    console.error(`Failed to generate image for ${title}:`, error);
  }

  return undefined;
}

const recipeSchema = {
  type: 'object' as const,
  properties: {
    recipes: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, description: 'Unique identifier for the recipe' },
          title: { type: 'string' as const, description: 'Name of the recipe' },
          description: { type: 'string' as const, description: 'Brief description of the dish (1-2 sentences)' },
          cookTime: { type: 'string' as const, description: 'Total cooking time (e.g., "30 minutes", "1 hour")' },
          difficulty: {
            type: 'string' as const,
            enum: ['Easy', 'Medium', 'Hard'],
            description: 'Difficulty level of the recipe',
          },
          ingredients: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'List of ingredients with quantities',
          },
          instructions: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'Step-by-step cooking instructions',
          },
        },
        required: ['id', 'title', 'description', 'cookTime', 'difficulty', 'ingredients', 'instructions'],
        additionalProperties: false,
      },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ['recipes'],
  additionalProperties: false,
};

const languageInstructions: Record<string, string> = {
  en: 'Respond in English.',
  ne: 'Respond entirely in Nepali (नेपाली). All recipe titles, descriptions, ingredients, and instructions must be written in Nepali language using Devanagari script.',
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ingredients, language = 'en', generateImages = false } = await request.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one ingredient' }, { status: 400 });
    }

    let service;
    try {
      service = createServiceClient();
    } catch {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const cacheKey = buildRecipeCacheKey(ingredients, language, Boolean(generateImages));

    const { data: cacheRow, error: cacheReadError } = await service
      .from('recipe_cache')
      .select('recipes, created_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (!cacheReadError && cacheRow?.recipes) {
      const created = cacheRow.created_at ? new Date(cacheRow.created_at).getTime() : 0;
      if (created && Date.now() - created <= CACHE_MS) {
        return NextResponse.json({
          recipes: cacheRow.recipes as Recipe[],
          cached: true,
        });
      }
      await service.from('recipe_cache').delete().eq('cache_key', cacheKey);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const polarState = await fetchPolarProStateForUser({ id: user.id, email: user.email });

    const { data: usageRow } = await service
      .from('usage')
      .select('recipe_search_count')
      .eq('user_id', user.id)
      .maybeSingle();

    const usedSearches = usageRow?.recipe_search_count ?? 0;
    const freeLimit = getFreeSearchLimit();

    if (!polarState.isPro && usedSearches >= freeLimit) {
      return NextResponse.json(
        {
          error: 'Free search limit reached',
          code: 'QUOTA_EXCEEDED',
          limit: freeLimit,
          used: usedSearches,
        },
        { status: 402 }
      );
    }

    if (generateImages && !polarState.isPro) {
      return NextResponse.json(
        {
          error: 'Recipe images are included with Pro. Upgrade to generate images.',
          code: 'IMAGES_PRO_REQUIRED',
        },
        { status: 402 }
      );
    }

    const ingredientList = ingredients.join(', ');
    const langInstruction = languageInstructions[language] || languageInstructions.en;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful culinary assistant. Given a list of ingredients, suggest exactly 4 recipes that can be made using primarily those ingredients. 

${langInstruction}

Rules:
- Each recipe should primarily use the provided ingredients
- You may include common pantry staples (salt, pepper, oil, butter, garlic, onion, basic spices) that most kitchens have
- Provide realistic cooking times and difficulty levels
- Instructions should be clear and actionable
- Each ingredient in the list should include its quantity
- Generate unique IDs using a combination of the recipe name in lowercase with hyphens (e.g., "chicken-stir-fry")
- Vary the difficulty levels and cooking times across the 4 recipes when possible`,
        },
        {
          role: 'user',
          content: `I have these ingredients: ${ingredientList}. What recipes can I make?`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'recipe_suggestions',
          strict: true,
          schema: recipeSchema,
        },
      },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content) as { recipes: Recipe[] };
    let recipes = parsed.recipes;

    if (generateImages) {
      const imagePromises = recipes.map(async (recipe) => {
        const imageUrl = await generateRecipeImage(openai, recipe.title, recipe.description);
        return { ...recipe, imageUrl };
      });
      recipes = await Promise.all(imagePromises);
    }

    await service.from('recipe_cache').upsert(
      {
        cache_key: cacheKey,
        language,
        generate_images: Boolean(generateImages),
        recipes,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' }
    );

    if (!polarState.isPro) {
      const { error: rpcError } = await service.rpc('increment_recipe_search_count', {
        p_user_id: user.id,
      });
      if (rpcError) {
        console.error('increment_recipe_search_count:', rpcError);
      }
    }

    return NextResponse.json({
      recipes,
      cached: false,
    });
  } catch (error) {
    console.error('Recipe API error:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json({ error: 'Failed to generate recipes. Please try again.' }, { status: 500 });
  }
}
