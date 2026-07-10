import { createClient } from '@supabase/supabase-js';

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

/** Sube una imagen en formato data URL (data:image/png;base64,...) y devuelve la URL pública */
export async function subirImagen(dataUrl: string): Promise<string> {
  const supabase = getClient();
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Formato de imagen inválido, se espera un data URL base64.');

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  if (!bucketChecked) {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
    bucketChecked = true;
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, { contentType: mime, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
  return publicUrl;
}
