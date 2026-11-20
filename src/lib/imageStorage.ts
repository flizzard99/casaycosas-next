import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2';
import { MAX_UPLOAD_DIRECT_BYTES } from './uploadLimits';

const BUCKET_NAME = R2_BUCKET_NAME;

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

function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
}

export async function subirImagen(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Formato de imagen inválido, se espera un data URL base64.');

  let mime = match[1].toLowerCase();
  if (MIME_ALIAS[mime]) mime = MIME_ALIAS[mime];
  if (!MIME_ALLOW.has(mime)) {
    throw new Error(`Tipo de imagen no permitido: ${mime}. Solo JPG, PNG, WebP, GIF, AVIF y HEIC.`);
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_UPLOAD_DIRECT_BYTES) {
    throw new Error('La imagen supera 4 MB para formato HEIC.');
  }

  return guardarImagen(await procesarImagen(mime, buffer));
}

export async function guardarImagen({ buffer, mime, ext }: Procesada): Promise<string> {
  const key = `product-images/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );

  return publicUrl(key);
}

const MIME_SIGN_ALLOW = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const EXT_SIGN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

export async function createSignedUploadUrl(contentType: string): Promise<{ signedUrl: string; publicUrl: string }> {
  const mime = contentType.toLowerCase();
  if (!MIME_SIGN_ALLOW.has(mime)) {
    throw new Error(`Tipo no permitido para subida directa: ${mime}`);
  }
  const ext = EXT_SIGN[mime];
  const key = `product-images/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mime,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

  return { signedUrl, publicUrl: publicUrl(key) };
}
