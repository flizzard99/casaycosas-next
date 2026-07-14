import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';

const BUCKET_NAME = 'product-images';
let bucketChecked = false;

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY no configuradas.');
  }
  return createClient(url, key);
}

export type Procesada = { buffer: Buffer; mime: string; ext: string };

const MIME_ALLOW = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif'
]);

const MIME_ALIAS: Record<string, string> = {
  'image/heic-sequence': 'image/heic',
  'image/heif-sequence': 'image/heif'
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'jpg',
  'image/heif': 'jpg'
};

const MIME_NEEDS_CONVERT = new Set(['image/heic', 'image/heif', 'image/avif']);

async function procesarImagen(mime: string, buffer: Buffer): Promise<Procesada> {
  if (!MIME_NEEDS_CONVERT.has(mime)) {
    return { buffer, mime, ext: EXT_BY_MIME[mime] };
  }
  const convertido = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return { buffer: convertido, mime: 'image/jpeg', ext: 'jpg' };
}

export async function subirImagen(dataUrl: string): Promise<string> {
  const supabase = getClient();
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Formato de imagen inválido, se espera un data URL base64.');

  let mime = match[1].toLowerCase();
  if (MIME_ALIAS[mime]) mime = MIME_ALIAS[mime];
  if (!MIME_ALLOW.has(mime)) {
    throw new Error(`Tipo de imagen no permitido: ${mime}. Solo JPG, PNG, WebP, GIF, AVIF y HEIC.`);
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen supera 4 MB.');
  }

  const { buffer: finalBuffer, mime: finalMime, ext } = await procesarImagen(mime, buffer);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  if (!bucketChecked) {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
    bucketChecked = true;
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, finalBuffer, { contentType: finalMime, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
  return publicUrl;
}