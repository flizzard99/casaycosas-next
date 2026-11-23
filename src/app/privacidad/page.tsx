import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Casa y Cosas recopila, utiliza y protege los datos personales.',
  alternates: { canonical: '/privacidad' }
};

export default function PrivacidadPage() {
  return (
    <LegalPage titulo="Política de privacidad" introduccion="Explicamos qué datos utilizamos, para qué los necesitamos y cómo puedes ejercer tus derechos.">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>Comercializadora Nexus Solutions SpA es responsable de los datos personales tratados al navegar, comprar, solicitar seguimiento o contactar a Casa y Cosas.</p>
      </section>
      <section>
        <h2>2. Datos que recopilamos</h2>
        <ul>
          <li>Identificación y contacto: nombre, RUT, correo y teléfono.</li>
          <li>Despacho: región, comuna, dirección y notas voluntarias.</li>
          <li>Compra: productos, variantes, montos, medio y estado de pago.</li>
          <li>Datos técnicos necesarios para seguridad, prevención de abuso y funcionamiento de la sesión.</li>
        </ul>
        <p>Casa y Cosas no recibe ni conserva el número completo o código de seguridad de las tarjetas procesadas por Mercado Pago.</p>
      </section>
      <section>
        <h2>3. Finalidades</h2>
        <p>Utilizamos los datos para procesar y despachar compras, verificar pagos, emitir documentos tributarios, enviar comunicaciones transaccionales, atender consultas, gestionar retractos o garantías, prevenir fraude y cumplir obligaciones legales.</p>
        <p>Las comunicaciones promocionales requieren autorización y siempre deben permitir dejar de recibirlas.</p>
      </section>
      <section>
        <h2>4. Proveedores necesarios</h2>
        <p>Los datos estrictamente necesarios pueden ser tratados por proveedores de infraestructura y operación, como Vercel, Supabase, Cloudflare, Resend, Mercado Pago y Blue Express. Cada proveedor actúa dentro de la función contratada y puede operar infraestructura fuera de Chile bajo sus propias medidas y condiciones de protección.</p>
      </section>
      <section>
        <h2>5. Conservación</h2>
        <p>Los datos se conservan mientras sean necesarios para administrar la compra y durante los plazos exigidos por obligaciones tributarias, contables, de garantía o defensa de derechos. Después se eliminan o anonimizan de manera razonable, salvo obligación legal de conservación.</p>
      </section>
      <section>
        <h2>6. Derechos de las personas</h2>
        <p>La persona titular puede solicitar información sobre sus datos y, cuando corresponda, su acceso, rectificación, actualización, eliminación, oposición o portabilidad conforme a la legislación chilena vigente. La solicitud debe permitir verificar la identidad para evitar entregar información a terceros.</p>
      </section>
      <section>
        <h2>7. Almacenamiento local y cookies</h2>
        <p>La tienda utiliza almacenamiento del navegador y cookies estrictamente necesarias para conservar el carrito, recordar el tema visual, proteger sesiones y permitir el acceso al seguimiento. No se utilizan para vender datos personales.</p>
      </section>
      <section>
        <h2>8. Seguridad y menores</h2>
        <p>Aplicamos controles razonables de acceso, cifrado en tránsito y validación de operaciones. Ningún sistema es completamente infalible; ante un incidente relevante se adoptarán medidas de contención y comunicación conforme a la normativa aplicable.</p>
        <p>Las compras deben ser realizadas por mayores de edad o con autorización de su representante.</p>
      </section>
    </LegalPage>
  );
}
