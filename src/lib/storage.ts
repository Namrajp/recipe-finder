import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

const BUCKET = 'recipe-images';

export function generateImageHash(title: string): string {
  return createHash('md5').update(`${title}-food-photo`).digest('hex');
}

export async function imageExists(hash: string): Promise<string | null> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.from('recipe_images').select('public_url').eq('hash', hash).maybeSingle();
    if (error || !data) return null;
    return data.public_url;
  } catch {
    return null;
  }
}

export async function saveImage(hash: string, imageBuffer: Buffer): Promise<string> {
  const service = createServiceClient();
  const path = `${hash}.png`;

  const { error: uploadError } = await service.storage.from(BUCKET).upload(path, imageBuffer, {
    contentType: 'image/png',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET).getPublicUrl(path);

  const { error: dbError } = await service.from('recipe_images').upsert(
    {
      hash,
      storage_path: path,
      public_url: publicUrl,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'hash' }
  );

  if (dbError) {
    console.error('recipe_images upsert:', dbError);
  }

  return publicUrl;
}
