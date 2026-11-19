export function nombreCategoria(categoria: string): string {
  return categoria.toLocaleLowerCase('es-CL').replace(/\p{L}[\p{L}\p{M}]*/gu,
    (palabra) => palabra[0].toLocaleUpperCase('es-CL') + palabra.slice(1));
}
