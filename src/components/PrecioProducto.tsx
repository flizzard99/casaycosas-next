import { formatoCLP, precioActual } from '@/lib/precios';

export default function PrecioProducto({ producto, className }: {
  producto: { price: number; precioOferta: number | null };
  className?: string;
}) {
  const actual = precioActual(producto);
  return (
    <p className={className}>
      {actual < producto.price && (
        <>
          <span className="sr-only">Precio normal: </span>
          <del className="shop-muted mr-2 text-sm font-normal">{formatoCLP.format(producto.price)}</del>
          <span className="sr-only"> Precio oferta: </span>
        </>
      )}
      <span>{formatoCLP.format(actual)}</span>
    </p>
  );
}
