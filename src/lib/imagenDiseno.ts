import { MAX_UPLOAD_DIRECT_BYTES } from './uploadLimits';

export async function prepararArchivoDiseno(archivo: File): Promise<Blob> {
  if (archivo.size <= MAX_UPLOAD_DIRECT_BYTES) return archivo;

  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error('No pudimos abrir la imagen. Prueba con un archivo JPG, PNG o WebP.');
  }

  try {
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('El navegador no pudo reducir el tamaño de la imagen.');

    for (const lado of [2200, 1600, 1100]) {
      const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
      canvas.width = Math.max(1, Math.round(imagen.width * escala));
      canvas.height = Math.max(1, Math.round(imagen.height * escala));
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
      if (blob && blob.size <= MAX_UPLOAD_DIRECT_BYTES) return blob;
    }
    throw new Error('No pudimos reducir la imagen a 4 MB. Prueba con un archivo más liviano.');
  } finally {
    imagen.close();
  }
}
