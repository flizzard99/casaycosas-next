import type { Metadata } from 'next';
import ShopSection from '@/components/ShopSection';
import { LINEAS } from '@/lib/lineas';

export const revalidate = 60;

export const metadata: Metadata = {
  title: LINEAS.matera.nombre,
  description: LINEAS.matera.descripcion,
  alternates: { canonical: LINEAS.matera.href }
};

export default function ColeccionPage() {
  return <ShopSection linea="matera" />;
}
