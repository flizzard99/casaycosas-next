import { PutObjectCommand } from '@aws-sdk/client-s3';
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
  'image/avif',
  'image/heic',
  'image/heif'
]);

const MIME_ALIAS: Record<string, string> = {
  'image/heic-sequence': 'image/heic',
  'image/heif-sequence': 'image/heif'
};

async function procesarImagen(mime: string, buffer: Buffer): Promise<Procesada> {
  if (!MIME_ALLOW.has(mime)) throw new Error('Tipo de imagen no permitido.');
  try {
    const imagen = sharp(buffer, { failOn: 'error', limitInputPixels: 60_000_000 });
    const datos = await imagen.metadata();
    if (!datos.width || !datos.height || !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(datos.format ?? '')) {
      throw new Error('Formato no permitido');
    }
    const convertido = await imagen.rotate()
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, effort: 4 })
      .toBuffer();
    return { buffer: convertido, mime: 'image/webp', ext: 'webp' };
  } catch {
    throw new Error('No pudimos leer la imagen. Revisa que el archivo esté en buen estado.');
  }
}

function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
}

export async function subirArchivoImagen(mime: string, buffer: Buffer): Promise<string> {
  const tipo = MIME_ALIAS[mime.toLowerCase()] ?? mime.toLowerCase();
  if (!MIME_ALLOW.has(tipo)) {
    throw new Error('Tipo de imagen no permitido. Usa JPG, PNG, WebP, AVIF o HEIC.');
  }
  if (!buffer.length) throw new Error('El archivo está vacío.');
  if (buffer.length > MAX_UPLOAD_DIRECT_BYTES) throw new Error('La imagen supera 4 MB después de prepararla.');
  return guardarImagen(await procesarImagen(tipo, buffer));
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
