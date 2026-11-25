# Operación de privacidad de Casa y Cosas

## Operación confirmada

- Los dueños atienden por WhatsApp las consultas sobre pedidos, las solicitudes de factura y el ejercicio de derechos de privacidad.
- La tienda vende y despacha únicamente dentro de Chile. La ubicación del tratamiento y las condiciones de transferencia de los proveedores se verifican por separado.
- Servicios activos confirmados: Vercel, Supabase, Cloudflare R2, Resend, Mercado Pago, WhatsApp, Instagram y Upstash.
- Para despachar, Blue Express requiere región, comuna, modalidad de entrega y nombre y contacto de quien recibe. La entrega a domicilio requiere dirección completa y referencias o departamento cuando apliquen. El retiro requiere identificar un Punto Blue Express. Si el cliente contrata envío en el checkout, la opción disponible es a domicilio.

## Solicitudes de derechos

1. Revisar el WhatsApp de la tienda y registrar la fecha de recepción, derecho solicitado, responsable interno, estado y fecha límite. Confirmar el plazo aplicable y registrar cualquier prórroga con su motivo y aviso.
2. Verificar la identidad de manera proporcional. Para una compra, comenzar por el correo asociado y su código. Usar un canal seguro si se requiere más información.
3. Revisar pedidos, soporte, facturación, despacho y proveedores según la solicitud. Antes de suprimir datos, verificar pagos pendientes o en revisión, devoluciones, reclamos y obligaciones de conservación. Restringir el uso si corresponde.
4. Responder por un canal verificado y registrar la resolución, sus fundamentos y las acciones pendientes de proveedores. Restringir el acceso al registro de solicitudes y aplicarle su propio plazo de conservación.

## Conservación e incidentes

- La papelera del panel muestra los últimos 30 días. Los pedidos retirados con más antigüedad aparecen en el archivo y pueden restaurarse. El archivo no ejecuta un borrado físico.
- Antes de activar una purga, aprobar plazos y excepciones para pedidos pagados, abandonados o vencidos, documentos tributarios, reclamos, soporte, logs y respaldos. Probar con datos ficticios que un pedido sujeto a conservación queda excluido y que restaurar un respaldo no reactiva datos suprimidos.
- Si hay un incidente, restringir el acceso afectado, preservar evidencia con acceso limitado y documentar alcance, datos afectados, medidas y tiempos. Evaluar y ejecutar los avisos requeridos a la Agencia y a las personas afectadas.

## Validaciones pendientes

- Confirmar razón social, RUT, domicilio y correo del responsable, y asignar quién atiende solicitudes de privacidad y factura.
- Confirmar contratos, roles, regiones y mecanismos de transferencia de los proveedores que efectivamente operan. Completar el registro interno por tratamiento y validar el fundamento de seguridad invocado.
- Verificar el modo de pruebas de pagos, el seguimiento de pedidos antiguos y nuevos y el archivado de pedidos en una base aislada. Comprobar en producción la configuración de Upstash para que el límite de seguimiento se comparta entre instancias.
