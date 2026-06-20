/**
 * Cierra una unión discriminada: si llega un caso no contemplado, el
 * compilador falla (tipo `never`) y en runtime lanza.
 */
export function exhaustive(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
