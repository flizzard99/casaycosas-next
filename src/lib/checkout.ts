export const ENVIO_CHILE = { servicio: 'Blue Express', precio: 4000 };
export const TRANSFERENCIA_RESERVA_HORAS = 48;

export type MetodoPago = 'tarjeta' | 'transferencia';

export type DatosTransferencia = {
  titular: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correo?: string;
};

export const CAMPOS_TRANSFERENCIA = [
  { clave: 'titular', etiqueta: 'Titular', maxLength: 120 },
  { clave: 'rut', etiqueta: 'RUT', maxLength: 16 },
  { clave: 'banco', etiqueta: 'Banco', maxLength: 80 },
  { clave: 'tipoCuenta', etiqueta: 'Tipo de cuenta', maxLength: 50 },
  { clave: 'numeroCuenta', etiqueta: 'Número de cuenta', maxLength: 30 },
  { clave: 'correo', etiqueta: 'Correo para comprobantes', maxLength: 200 }
] as const;

export function formatearRut(valor: string) {
  const limpio = valor.toUpperCase().replace(/[^0-9K]/g, '');
  const digitoK = limpio.endsWith('K');
  const rut = limpio.replace(/K/g, '').slice(0, digitoK ? 8 : 9) + (digitoK ? 'K' : '');
  if (rut.length < 2) return rut;
  const cuerpo = rut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${rut.at(-1)}`;
}

export function normalizarRut(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length > 16) return null;
  const coincidencia = /^(\d{1,8})([0-9K])$/.exec(valor.replace(/[.\s-]/g, '').toUpperCase());
  if (!coincidencia || Number(coincidencia[1]) === 0) return null;
  const [, cuerpo, digito] = coincidencia;
  const suma = [...cuerpo].reverse().reduce((total, numero, i) => total + Number(numero) * (2 + i % 6), 0);
  const esperado = (11 - suma % 11) % 11;
  if (digito !== (esperado === 10 ? 'K' : String(esperado))) return null;
  return formatearRut(`${Number(cuerpo)}${digito}`);
}

export function rutaSeguimiento(codigo: string | number, referencia?: string | null) {
  return `/mi-pedido/${encodeURIComponent(String(codigo))}${referencia ? `?ref=${encodeURIComponent(referencia)}` : ''}`;
}
