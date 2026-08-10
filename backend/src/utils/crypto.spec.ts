import { encrypt, decrypt } from './crypto';

jest.mock('../config/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
}));

describe('encrypt / decrypt', () => {
  const originalEncryptionKey = process.env.SMTP_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SMTP_ENCRYPTION_KEY = 'clave-de-pruebas-para-cifrado-simetrico';
  });

  afterEach(() => {
    process.env.SMTP_ENCRYPTION_KEY = originalEncryptionKey;
  });

  it('recupera el texto original tras el ciclo completo', () => {
    const secreto = 'Contraseña del bind LDAP ñ áé';

    expect(decrypt(encrypt(secreto))).toBe(secreto);
  });

  it('produce un criptograma distinto en cada cifrado por el IV aleatorio', () => {
    const primero = encrypt('mismo-valor');
    const segundo = encrypt('mismo-valor');

    expect(primero).not.toBe(segundo);
    expect(decrypt(primero)).toBe(decrypt(segundo));
  });

  it('trata la cadena vacía como valor ausente en ambos sentidos', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('devuelve el valor recibido cuando el formato no es el esperado', () => {
    // Comportamiento actual: decrypt nunca lanza; ante un valor no cifrado lo retorna igual.
    expect(decrypt('texto-plano-sin-iv')).toBe('texto-plano-sin-iv');
  });

  it('devuelve el criptograma sin descifrar cuando la clave cambió', () => {
    const cifrado = encrypt('secreto-original');

    process.env.SMTP_ENCRYPTION_KEY = 'otra-clave-completamente-distinta';

    // Documenta el fallo silencioso: no lanza ni avisa, retorna el criptograma tal cual.
    expect(decrypt(cifrado)).toBe(cifrado);
  });
});
