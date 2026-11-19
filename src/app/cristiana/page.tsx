import type { Metadata } from 'next';
import ShopSection from '@/components/ShopSection';
import { LINEAS } from '@/lib/lineas';

export const revalidate = 60;

export const metadata: Metadata = {
  title: LINEAS.cristiana.nombre,
  description: LINEAS.cristiana.descripcion,
  alternates: { canonical: LINEAS.cristiana.href }
};

export default function ColeccionPage() {
  return <ShopSection linea="cristiana" />;
}
