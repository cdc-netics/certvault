import type { Request } from 'express';
import { getFrontendBaseUrl, buildVerifyLink, buildResetLink } from './frontendUrl';

/**
 * Construye un objeto Request mínimo con solo lo que consume getFrontendBaseUrl.
 * Se castea a Request porque la utilidad únicamente lee cabeceras, protocolo y host.
 */
const fakeRequest = (options: {
  headers?: Record<string, string>;
  protocol?: string;
  host?: string;
}): Request => {
  const headers = options.headers ?? {};
  return {
    headers,
    protocol: options.protocol ?? 'http',
    get: (name: string) => (name.toLowerCase() === 'host' ? options.host : undefined)
  } as unknown as Request;
};

describe('getFrontendBaseUrl', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  describe('sin req (resolución estática por entorno)', () => {
    it('con FRONTEND_URL separado por comas usa SOLO la primera URL (regresión del link malformado)', () => {
      process.env.FRONTEND_URL = 'http://10.0.0.5:8080,https://certvault.netics.corp';

      const base = getFrontendBaseUrl();

      expect(base).toBe('http://10.0.0.5:8080');
      // La segunda URL nunca debe quedar concatenada dentro de la base.
      expect(base).not.toContain(',');
      expect(base).not.toContain('https://');
    });

    it('normaliza espacios y barra final en cada entrada de la lista', () => {
      process.env.FRONTEND_URL = ' http://10.0.0.5:8080/ , https://certvault.netics.corp/ ';

      expect(getFrontendBaseUrl()).toBe('http://10.0.0.5:8080');
    });

    it('con una sola URL devuelve esa URL', () => {
      process.env.FRONTEND_URL = 'https://certvault.netics.corp';

      expect(getFrontendBaseUrl()).toBe('https://certvault.netics.corp');
    });

    it('lanza error cuando FRONTEND_URL no está definido y no hay req', () => {
      delete process.env.FRONTEND_URL;

      expect(() => getFrontendBaseUrl()).toThrow(/FRONTEND_URL/);
    });
  });

  describe('con req (resolución dinámica)', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'http://10.0.0.5:8080,https://certvault.netics.corp';
    });

    it('prefiere la URL configurada que coincide con la cabecera Origin', () => {
      const req = fakeRequest({ headers: { origin: 'https://certvault.netics.corp' } });

      expect(getFrontendBaseUrl(req)).toBe('https://certvault.netics.corp');
    });

    it('usa el Origin cuando no coincide con ninguna URL configurada', () => {
      const req = fakeRequest({ headers: { origin: 'https://otra.interna.corp' } });

      expect(getFrontendBaseUrl(req)).toBe('https://otra.interna.corp');
    });

    it('cae al Referer cuando no hay Origin', () => {
      const req = fakeRequest({ headers: { referer: 'https://certvault.netics.corp/verify-email?x=1' } });

      expect(getFrontendBaseUrl(req)).toBe('https://certvault.netics.corp');
    });

    it('cae a Host/Proto (proxy) cuando no hay Origin ni Referer', () => {
      const req = fakeRequest({
        headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'certvault.netics.corp' }
      });

      expect(getFrontendBaseUrl(req)).toBe('https://certvault.netics.corp');
    });

    it('ignora un Referer inválido y continúa con Host/Proto', () => {
      const req = fakeRequest({
        headers: { referer: 'no-es-una-url', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'certvault.netics.corp' }
      });

      expect(getFrontendBaseUrl(req)).toBe('https://certvault.netics.corp');
    });
  });
});

describe('buildVerifyLink', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('genera un enlace único y bien formado desde una FRONTEND_URL con múltiples URLs (regresión)', () => {
    process.env.FRONTEND_URL = 'http://10.0.0.5:8080,https://certvault.netics.corp';

    const link = buildVerifyLink('tok123', 'user@empresa.cl');

    expect(link).toBe('http://10.0.0.5:8080/verify-email?token=tok123&email=user%40empresa.cl');
    // Un solo esquema en toda la URL: no debe existir el patrón "...https://" incrustado.
    expect(link.match(/https?:\/\//g)).toHaveLength(1);
  });

  it('codifica correctamente el email en la query string', () => {
    process.env.FRONTEND_URL = 'https://certvault.netics.corp';

    const link = buildVerifyLink('abc', 'a+b@dominio.com');

    expect(link).toContain('email=a%2Bb%40dominio.com');
  });
});

describe('buildResetLink', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('genera un enlace de reset con la base correcta desde una lista separada por comas', () => {
    process.env.FRONTEND_URL = 'http://10.0.0.5:8080,https://certvault.netics.corp';

    const link = buildResetLink('rtok', 'user@empresa.cl');

    expect(link).toBe('http://10.0.0.5:8080/reset-password?token=rtok&email=user%40empresa.cl');
  });
});
