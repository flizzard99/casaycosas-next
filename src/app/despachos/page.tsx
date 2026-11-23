import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { ENVIO_CHILE } from '@/lib/checkout';
import { formatoCLP } from '@/lib/precios';

export const metadata: Metadata = {
  title: 'Política de despachos',
  description: 'Cobertura, preparación y seguimiento de despachos de Casa y Cosas.',
  alternates: { canonical: '/despachos' }
};

export default function DespachosPage() {
  return (
    <LegalPage titulo="Política de despachos" introduccion="Condiciones de preparación, entrega y seguimiento para las compras enviadas por Casa y Cosas.">
      <section>
        <h2>1. Servicio y costo</h2>
        <p>El despacho se realiza mediante {ENVIO_CHILE.servicio} con una tarifa fija de <strong>{formatoCLP.format(ENVIO_CHILE.precio)}</strong>, informada y sumada al total antes del pago. La cobertura efectiva depende de las comunas y condiciones operativas del transportista.</p>
      </section>
      <section>
        <h2>2. Preparación</h2>
        <p>La preparación comienza después de confirmarse el pago. Los productos disponibles se preparan dentro de un máximo estimado de cinco días hábiles. Productos personalizados, restauraciones, preventas o campañas especiales pueden tener un plazo distinto, que deberá informarse al cliente antes de confirmar ese servicio.</p>
      </section>
      <section>
        <h2>3. Plazo de transporte</h2>
        <p>El tiempo de traslado comienza cuando el pedido es recibido por el transportista. Su duración depende del destino, días hábiles, contingencias y cobertura de {ENVIO_CHILE.servicio}. Cuando exista código de seguimiento se informará por correo y aparecerá en la página del pedido.</p>
      </section>
      <section>
        <h2>4. Dirección y recepción</h2>
        <p>El cliente debe entregar una dirección completa, comuna, región y teléfono de contacto. Antes del despacho puede solicitar una corrección; después de entregado al transportista, cualquier cambio queda sujeto a disponibilidad y costos adicionales.</p>
        <p>Si la entrega falla por dirección incorrecta, ausencia reiterada o rechazo injustificado, el costo de un nuevo despacho podrá ser cobrado al cliente, sin afectar sus derechos legales.</p>
      </section>
      <section>
        <h2>5. Revisión del paquete</h2>
        <p>Al recibir, recomendamos revisar el estado exterior del paquete y conservar fotografías si presenta golpes, humedad o señales de apertura. Si falta un producto o llega dañado, contacta a Casa y Cosas tan pronto sea posible indicando el código del pedido. Esto facilita la gestión y no reduce el plazo de la garantía legal.</p>
      </section>
      <section>
        <h2>6. Demoras o extravíos</h2>
        <p>Casa y Cosas colaborará con el transportista para investigar demoras, entregas erróneas o extravíos. Si se confirma que el pedido no puede ser entregado, se ofrecerá reposición o devolución según corresponda.</p>
      </section>
    </LegalPage>
  );
}
