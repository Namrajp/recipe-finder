import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Recipe } from '@/types/recipe';
import { generateImageHash, imageExists, saveImage } from '@/lib/storage';

async function generateRecipeImage(
  openai: OpenAI,
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

    const response = await openai.images.generate({
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
            description: 'Difficulty level of the recipe' 
          },
          ingredients: { 
            type: 'array' as const, 
            items: { type: 'string' as const },
            description: 'List of ingredients with quantities' 
          },
          instructions: { 
            type: 'array' as const, 
            items: { type: 'string' as const },
            description: 'Step-by-step cooking instructions' 
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
  // #region agent log
  fetch('http://127.0.0.1:7560/ingest/1b7ef0c3-5c65-4684-9d34-447f7bca3e41',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9b595'},body:JSON.stringify({sessionId:'f9b595',location:'recipes/route.ts:POST-entry',message:'Recipes API called',data:{},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  try {
    const { ingredients, language = 'en', generateImages = false } = await request.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one ingredient' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
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
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
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

    return NextResponse.json({
      recipes,
      cached: false,
    });
  } catch (error) {
    console.error('Recipe API error:', error);
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate recipes. Please try again.' },
      { status: 500 }
    );
  }
}
