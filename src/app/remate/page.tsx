import type { Metadata } from 'next';
import ShopSection from '@/components/ShopSection';
import { LINEAS } from '@/lib/lineas';

export const revalidate = 60;

export const metadata: Metadata = {
  title: LINEAS.remate.nombre,
  description: LINEAS.remate.descripcion,
  alternates: { canonical: LINEAS.remate.href }
};

export default function ColeccionPage() {
  return <ShopSection linea="remate" />;
}
