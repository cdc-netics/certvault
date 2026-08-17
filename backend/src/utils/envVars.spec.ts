import { readPositiveInt } from './envVars';

describe('readPositiveInt', () => {
  const VARIABLE = 'TEST_POSITIVE_INT';

  afterEach(() => {
    delete process.env[VARIABLE];
  });

  it('usa el valor por defecto cuando la variable no esta definida', () => {
    expect(readPositiveInt(VARIABLE, 100)).toBe(100);
  });

  it('usa el valor por defecto cuando la variable esta vacia o solo tiene espacios', () => {
    process.env[VARIABLE] = '   ';
    expect(readPositiveInt(VARIABLE, 100)).toBe(100);
  });

  it('lee el entero configurado ignorando espacios alrededor', () => {
    process.env[VARIABLE] = ' 42 ';
    expect(readPositiveInt(VARIABLE, 100)).toBe(42);
  });

  // Sin este rechazo el valor se convertiria en NaN y el limite quedaria desactivado en silencio.
  it.each(['15m', 'cinco', '1e3ms', '10.5'])('rechaza el valor no entero "%s"', (invalidValue) => {
    process.env[VARIABLE] = invalidValue;
    expect(() => readPositiveInt(VARIABLE, 100)).toThrow(VARIABLE);
  });

  it.each(['0', '-1'])('rechaza el valor no positivo "%s"', (invalidValue) => {
    process.env[VARIABLE] = invalidValue;
    expect(() => readPositiveInt(VARIABLE, 100)).toThrow(VARIABLE);
  });
});
