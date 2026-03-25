import { put, head } from '@vercel/blob';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// #region agent log
fetch('http://127.0.0.1:7560/ingest/1b7ef0c3-5c65-4684-9d34-447f7bca3e41',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9b595'},body:JSON.stringify({sessionId:'f9b595',location:'storage.ts:module-load',message:'Storage module loaded',data:{nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
// #endregion

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOCAL_IMAGE_DIR = join(process.cwd(), 'public', 'recipe-images');

export function generateImageHash(title: string): string {
  return createHash('md5').update(`${title}-food-photo`).digest('hex');
}

export async function imageExists(hash: string): Promise<string | null> {
  if (IS_PRODUCTION) {
    try {
      const blobUrl = `recipe-images/${hash}.png`;
      const blob = await head(blobUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return blob.url;
    } catch {
      return null;
    }
  } else {
    const localPath = join(LOCAL_IMAGE_DIR, `${hash}.png`);
    if (existsSync(localPath)) {
      return `/recipe-images/${hash}.png`;
    }
    return null;
  }
}

export async function saveImage(hash: string, imageBuffer: Buffer): Promise<string> {
  if (IS_PRODUCTION) {
    const blob = await put(`recipe-images/${hash}.png`, imageBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    });
    return blob.url;
  } else {
    if (!existsSync(LOCAL_IMAGE_DIR)) {
      mkdirSync(LOCAL_IMAGE_DIR, { recursive: true });
    }
    const localPath = join(LOCAL_IMAGE_DIR, `${hash}.png`);
    writeFileSync(localPath, imageBuffer);
    return `/recipe-images/${hash}.png`;
  }
}

export async function getImageUrl(hash: string): Promise<string> {
  if (IS_PRODUCTION) {
    return `recipe-images/${hash}.png`;
  } else {
    return `/recipe-images/${hash}.png`;
  }
}
