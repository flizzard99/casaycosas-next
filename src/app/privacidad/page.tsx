import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { tienda } from '@/lib/config';
import { DATOS_VENDEDOR, FECHA_PRIVACIDAD } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Casa y Cosas usa los datos personales y cómo ejercer tus derechos.',
  alternates: { canonical: '/privacidad' }
};

export default function PrivacidadPage() {
  return (
    <LegalPage titulo="Política de privacidad" fecha={FECHA_PRIVACIDAD}
      introduccion="Conoce qué datos usa Casa y Cosas para gestionar tus compras, con quién los comparte y cómo ejercer tus derechos.">
      <section>
        <h2>1. Quién es responsable</h2>
        <p>{DATOS_VENDEDOR.razonSocial}, que opera como Casa y Cosas, es responsable del tratamiento de los datos personales de la tienda. Sus datos de contacto figuran al pie de esta política.</p>
      </section>
      <section>
        <h2>2. Datos, finalidades y bases del tratamiento</h2>
        <ul>
          <li><strong>Compra, entrega y seguimiento.</strong> Usamos tu nombre, correo, teléfono y datos del pedido para gestionar el pago, reservar los productos y enviarte avisos. Si eliges envío, también necesitamos la dirección, comuna y región para coordinar el despacho. Tratamos estos datos para gestionar tu compra y cumplir el contrato. La nota de despacho es opcional.</li>
          <li><strong>Pagos y facturación.</strong> Registramos el monto, el medio, la referencia y el estado del pago. Mercado Pago procesa los pagos con tarjeta y la tienda no recibe el número completo ni el código de seguridad. Solicitamos los datos de facturación que correspondan, incluido el RUT cuando sea necesario, para emitir documentos y cumplir obligaciones tributarias. Podemos conservar el RUT de pedidos anteriores cuando siga siendo necesario.</li>
          <li><strong>Consultas, cambios y reclamos.</strong> Si nos escribes, usamos tus datos de contacto, el mensaje y la información necesaria del pedido para responder y gestionar la solicitud. Según el caso, el tratamiento se basa en la relación contractual, obligaciones legales o la defensa de derechos.</li>
          <li><strong>Seguridad.</strong> Usamos datos técnicos como la dirección IP, las solicitudes al sitio y los registros de errores para proteger la tienda, limitar intentos y detectar abusos. Esta finalidad responde al interés legítimo de proteger el servicio y los pedidos, considerando los derechos de las personas.</li>
        </ul>
        <p>Los datos provienen principalmente de lo que nos entregas, de tu uso del sitio y de las confirmaciones de pago y despacho. El correo de compra se usa para los avisos del pedido. Si te invitamos a recibir promociones, podrás elegir por separado y retirar la autorización en cualquier momento.</p>
      </section>
      <section>
        <h2>3. Proveedores y transferencias</h2>
        <ul>
          <li><strong>Infraestructura.</strong> Vercel aloja el sitio, Supabase aloja la base de datos, Cloudflare R2 almacena las imágenes y Upstash ayuda a limitar intentos de acceso. Estos servicios pueden tratar información técnica necesaria para operar el sitio.</li>
          <li><strong>Pago y avisos.</strong> Mercado Pago recibe los datos necesarios para gestionar pagos con tarjeta. Resend procesa el correo y el contenido de los mensajes del pedido.</li>
          <li><strong>Despacho.</strong> Compartimos con Blue Express la región y comuna, el tipo de entrega y el nombre y contacto de quien recibe. Para la entrega a domicilio compartimos la dirección completa, incluida la numeración y, si corresponde, el departamento o las referencias de entrega. Si se habilita el retiro en Punto Blue Express, se indicará al transportista el punto seleccionado.</li>
          <li><strong>Soporte y obligaciones.</strong> El equipo de Casa y Cosas atiende consultas sobre pedidos, facturas y solicitudes de privacidad por WhatsApp. Si nos escribes por WhatsApp o Instagram, la plataforma trata los datos de ese canal según su propia política. Podemos comunicar información a autoridades competentes cuando exista una obligación legal y a quienes participen en la emisión o gestión de documentos tributarios cuando corresponda.</li>
        </ul>
        <p>La tienda vende y despacha dentro de Chile. Algunos servicios que usamos para operar la tienda pueden procesar datos en otros países. Cuando exista una transferencia internacional, se aplicará un mecanismo permitido por la legislación chilena y las garantías que correspondan según el destino y el proveedor.</p>
      </section>
      <section>
        <h2>4. Conservación</h2>
        <p>Conservamos los datos del pedido mientras sean necesarios para el pago, el despacho y la atención posterior. Los registros necesarios para obligaciones tributarias, garantías, reclamos o defensa de derechos se conservan durante los plazos aplicables. En pedidos abandonados o vencidos, el criterio es conservar únicamente lo necesario para resolver pagos, errores, fraudes o reclamos asociados.</p>
        <p>Para los mensajes, registros técnicos y respaldos se considera el tiempo necesario para responder, proteger o recuperar el servicio. Al terminar la finalidad y los plazos que correspondan, procede eliminar o anonimizar los datos.</p>
      </section>
      <section>
        <h2>5. Tus derechos</h2>
        <p>Puedes solicitar gratuitamente acceso, rectificación, supresión, oposición y portabilidad cuando proceda, conforme a la Ley N.º 19.628 sobre protección de datos personales y las modificaciones de la Ley N.º 21.719 en lo que resulte aplicable. También puedes pedir el bloqueo en los casos previstos por la ley y retirar tu consentimiento para los tratamientos basados en él.</p>
        <p>Escríbenos por <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a> e indica qué derecho quieres ejercer. Si la solicitud se refiere a una compra, es útil indicar su código. Podemos pedir información adicional para verificar tu identidad de manera proporcional. Evita enviar claves, datos bancarios o una copia de tu cédula en el primer mensaje.</p>
        <p>Responderemos dentro del plazo legal aplicable. Si una solicitud no procede, explicaremos el motivo. Puedes reclamar ante la Agencia de Protección de Datos Personales conforme al procedimiento vigente.</p>
      </section>
      <section>
        <h2>6. Cookies y almacenamiento del navegador</h2>
        <p>Usamos almacenamiento local para guardar el carrito y recordar el tema visual, y almacenamiento temporal para retomar la compra. Las cookies de sesión protegen el administrador y permiten conservar el acceso al seguimiento autorizado. Si borras estos datos desde el navegador, podrás perder el carrito, las preferencias o el acceso guardado.</p>
      </section>
      <section>
        <h2>7. Seguridad y menores de edad</h2>
        <p>Aplicamos controles de acceso y cifrado en tránsito. Si ocurre un incidente, adoptaremos medidas de contención y notificaremos a la autoridad y a las personas afectadas cuando corresponda según la ley.</p>
        <p>Las compras se dirigen a personas mayores de edad. Si una compra es para un menor, su representante debe realizarla y facilitar solo los datos necesarios para la entrega.</p>
      </section>
    </LegalPage>
  );
}
