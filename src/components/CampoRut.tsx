'use client';

import { type ComponentProps } from 'react';
import { formatearRut } from '@/lib/checkout';

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (valor: string) => void;
};

export default function CampoRut({ value, onValueChange, ...props }: Props) {
  return (
    <input type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false}
      maxLength={16} placeholder="12.345.678-5" {...props} value={value} onChange={(event) => {
        const campo = event.currentTarget;
        const ingresado = campo.value;
        const cursor = campo.selectionStart ?? ingresado.length;
        const formateado = formatearRut(ingresado);
        if (formateado !== ingresado) {
          const caracteres = ingresado.slice(0, cursor).replace(/[^0-9k]/gi, '').length;
          const posicion = cursor === ingresado.length ? formateado.length :
            ([...formateado.matchAll(/[0-9K]/g)][caracteres - 1]?.index ?? -1) + 1;
          campo.value = formateado;
          campo.setSelectionRange(posicion, posicion);
        }
        onValueChange(formateado);
      }} />
  );
}
