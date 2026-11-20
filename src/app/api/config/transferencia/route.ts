import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { CAMPOS_TRANSFERENCIA, normalizarRut } from '@/lib/checkout';
import { verifyCsrf } from '@/lib/csrf';
import { getDatosTransferencia, saveDatosTransferencia } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sesionValida(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!sesionValida(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ datos: await getDatosTransferencia() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar la cuenta de cobro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!sesionValida(req) || !verifyCsrf(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const entradas = CAMPOS_TRANSFERENCIA.map(({ clave, maxLength }) => {
    const valor = body?.[clave];
    return [clave, typeof valor === 'string' && valor.trim().length <= maxLength ? valor.trim() : ''] as const;
  });
  const datos = Object.fromEntries(entradas);
  const rut = normalizarRut(datos.rut);
  if (!datos.titular || !rut || !datos.banco || !datos.tipoCuenta || !/^\d{1,30}$/.test(datos.numeroCuenta) ||
      (body?.correo && !/^\S+@[^\s@]+\.[^\s@]+$/.test(datos.correo))) {
    return NextResponse.json({ error: 'Revisa el RUT, los datos de la cuenta y el correo para comprobantes.' }, { status: 400 });
  }

  try {
    const cuenta = { titular: datos.titular, rut, banco: datos.banco, tipoCuenta: datos.tipoCuenta, numeroCuenta: datos.numeroCuenta, correo: datos.correo || undefined };
    await saveDatosTransferencia(cuenta);
    return NextResponse.json({ datos: cuenta }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la cuenta de cobro.' }, { status: 500 });
  }
}
