import { revalidatePath } from 'next/cache';
import { LINEAS } from './lineas';

export function revalidarCatalogo() {
  for (const { href } of Object.values(LINEAS)) revalidatePath(href);
}
