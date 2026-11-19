import { NextResponse } from 'next/server';

export function POST() {
  return NextResponse.json(
    { error: 'Las reservas por WhatsApp ya no están disponibles. Ve a Finalizar compra.', checkoutUrl: '/comprar' },
    { status: 410 }
  );
}
