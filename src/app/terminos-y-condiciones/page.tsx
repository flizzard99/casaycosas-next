import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones aplicables a las compras realizadas en Casa y Cosas.',
  alternates: { canonical: '/terminos-y-condiciones' }
};

export default function TerminosPage() {
  return (
    <LegalPage titulo="Términos y condiciones" introduccion="Estas condiciones regulan el uso de la tienda y las compras efectuadas por internet en Casa y Cosas.">
      <section>
        <h2>1. Aplicación y aceptación</h2>
        <p>Al utilizar este sitio o confirmar una compra, la persona declara haber leído y aceptado estos términos, junto con las políticas de privacidad, despacho, retracto, cambios y garantía legal. Los derechos reconocidos por la legislación chilena de protección al consumidor prevalecen sobre cualquier estipulación incompatible.</p>
      </section>
      <section>
        <h2>2. Productos e información</h2>
        <p>Casa y Cosas procura que nombres, imágenes, características, variantes, precios y existencias sean correctos. Las imágenes son referenciales y pueden existir diferencias menores de color o terminación por la pantalla, fabricación artesanal o naturaleza del material.</p>
        <p>La disponibilidad se confirma al registrar el pedido. Si un error de inventario impide cumplir una compra pagada, se informará al cliente y se ofrecerá una solución o la devolución total del monto correspondiente.</p>
      </section>
      <section>
        <h2>3. Precios y promociones</h2>
        <p>Los precios están expresados en pesos chilenos y el total de la compra se informa antes del pago, incluido el costo de despacho. Las ofertas se aplican durante su vigencia o hasta agotar stock. La sección Remate corresponde a liquidaciones independientes y no se acumula automáticamente con otras promociones.</p>
      </section>
      <section>
        <h2>4. Formación de la compra</h2>
        <p>El cliente debe entregar datos completos y correctos. Al finalizar se genera un código de pedido y se envía un resumen al correo informado. La compra se considera pagada cuando Mercado Pago comunica su aprobación o cuando Casa y Cosas verifica una transferencia.</p>
        <p>Los pedidos con tarjeta reservan stock durante 45 minutos. Los pedidos por transferencia lo reservan durante 48 horas. Si el pago no se confirma dentro de ese plazo, el pedido puede expirar y las unidades vuelven al inventario.</p>
      </section>
      <section>
        <h2>5. Medios de pago y seguridad</h2>
        <p>Los pagos con tarjeta son procesados por Mercado Pago. Casa y Cosas no almacena números completos de tarjetas ni códigos de seguridad. En transferencias, el pedido se prepara únicamente después de verificar el abono en la cuenta informada al finalizar.</p>
      </section>
      <section>
        <h2>6. Documento tributario</h2>
        <p>Se emitirá el documento tributario que corresponda conforme a la normativa del Servicio de Impuestos Internos. El cliente es responsable de entregar oportunamente los datos requeridos cuando solicite factura.</p>
      </section>
      <section>
        <h2>7. Comunicaciones y seguimiento</h2>
        <p>Las notificaciones del pedido se enviarán al correo proporcionado. El estado también puede consultarse con el código del pedido y ese mismo correo. Es responsabilidad del cliente revisar que sus datos sean correctos y mantener la confidencialidad del acceso.</p>
      </section>
      <section>
        <h2>8. Uso del sitio</h2>
        <p>No se permite interferir con la seguridad o funcionamiento de la tienda, utilizar información falsa, efectuar operaciones fraudulentas ni reproducir contenidos o identidad gráfica sin autorización. Casa y Cosas puede bloquear actividad abusiva sin limitar los derechos de compras legítimas.</p>
      </section>
      <section>
        <h2>9. Responsabilidad y legislación</h2>
        <p>Nada en estos términos excluye la responsabilidad ni los derechos irrenunciables establecidos por la Ley N.º 19.496. Las controversias se regirán por las leyes de Chile y podrán presentarse ante el SERNAC o los tribunales competentes.</p>
      </section>
    </LegalPage>
  );
}
