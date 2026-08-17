/**
 * Lectura de variables de entorno numericas aplicando Fail Fast.
 *
 * Un valor mal escrito ("15m", "cinco") convertido con Number() produce NaN, y NaN se propaga
 * en silencio hasta el punto donde causa dano: un limite de peticiones NaN equivale a no tener
 * limite, y una vigencia de token NaN genera enlaces que nacen expirados. En ambos casos el
 * sintoma aparece lejos de la causa, asi que es preferible no arrancar.
 */
export const readPositiveInt = (variableName: string, fallback: number): number => {
  const rawValue = process.env[variableName]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `La variable de entorno ${variableName} debe ser un entero positivo; se recibio "${rawValue}".`
    );
  }

  return parsedValue;
};
