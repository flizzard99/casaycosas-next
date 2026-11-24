import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Cambios, retracto y garantía legal',
  description: 'Política de cambios, derecho a retracto y garantía legal de Casa y Cosas.',
  alternates: { canonical: '/cambios-devoluciones' }
};

export default function CambiosPage() {
  return (
    <LegalPage titulo="Cambios, retracto y garantía legal" introduccion="Explicamos por separado los cambios voluntarios, el retracto de compras a distancia y la garantía por productos defectuosos.">
      <section>
        <h2>1. Cambios voluntarios</h2>
        <p>Además de los derechos legales, puedes solicitar el cambio de un producto estándar dentro de 30 días corridos desde su recepción, presentando el código o comprobante de compra. Debe estar sin uso, completo y en condiciones que permitan volver a venderlo.</p>
        <p>El cambio está sujeto a disponibilidad. Si existe diferencia de precio deberá pagarse; si el nuevo producto vale menos, se entregará saldo a favor o devolución según se acuerde. Los costos de transporte de un cambio voluntario corresponden al cliente.</p>
      </section>
      <section>
        <h2>2. Derecho a retracto</h2>
        <p>En compras realizadas a distancia puedes comunicar el retracto dentro de 10 días corridos desde la recepción, conforme a la Ley N.º 19.496. Para ejercerlo debes identificar el pedido y manifestar de forma inequívoca tu decisión por el correo de contacto.</p>
        <p>El producto debe devolverse completo y en perfectas condiciones. Una vez recibido y revisado, se devolverán los montos que legalmente correspondan mediante un medio compatible con el pago original. Los costos directos de devolución corresponden al consumidor, salvo error de Casa y Cosas o acuerdo diferente.</p>
        <p>El retracto puede no proceder respecto de productos confeccionados conforme a especificaciones del cliente o claramente personalizados, bienes que por su naturaleza no puedan ser devueltos o se deterioren rápidamente, y servicios ya ejecutados con autorización, dentro de las excepciones permitidas por la ley.</p>
      </section>
      <section>
        <h2>3. Garantía legal</h2>
        <p>Si un producto nuevo presenta fallas, le faltan piezas, no sirve naturalmente para su uso o no coincide con lo informado, el consumidor puede ejercer la garantía legal durante seis meses desde la recepción y elegir, según corresponda, entre reparación gratuita, cambio o devolución del dinero.</p>
        <p>La garantía no cubre daños ocasionados por uso indebido, accidentes, desgaste normal o incumplimiento de instrucciones, sin perjuicio de que la causa de la falla pueda ser evaluada.</p>
      </section>
      <section>
        <h2>4. Productos personalizados y restauraciones</h2>
        <p>Antes de iniciar una personalización o restauración se deben confirmar alcance, precio y plazo. Estos trabajos no admiten cambios por preferencia una vez ejecutados, pero mantienen garantía respecto de defectos del trabajo realizado y todos los derechos que legalmente correspondan.</p>
      </section>
      <section>
        <h2>5. Cómo solicitarlo</h2>
        <p>Envía el código del pedido, motivo de la solicitud y fotografías cuando exista daño o defecto. Casa y Cosas responderá con instrucciones de entrega o envío. Nunca será obligatorio contactar directamente al fabricante para ejercer la garantía frente al vendedor.</p>
      </section>
      <section>
        <h2>6. Reembolsos</h2>
        <p>Una vez aprobada una devolución, el reembolso se gestionará mediante el medio técnicamente disponible y se informará al cliente. Los plazos bancarios o de Mercado Pago posteriores a la emisión dependen de cada proveedor.</p>
      </section>
    </LegalPage>
  );
}
