import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateImageHash, imageExists, saveImage } from '@/lib/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Recipe title is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const hash = generateImageHash(title);

    const existingUrl = await imageExists(hash);
    if (existingUrl) {
      return NextResponse.json({ imageUrl: existingUrl, cached: true });
    }

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

    if (!imageData) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(imageData, 'base64');
    const imageUrl = await saveImage(hash, buffer);

    return NextResponse.json({ imageUrl, cached: false });
  } catch (error) {
    console.error('Image generation error:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
