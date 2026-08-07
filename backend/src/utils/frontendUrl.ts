import { Request } from 'express';

/**
 * Resuelve la URL base del frontend de forma robusta y centralizada.
 *
 * `FRONTEND_URL` puede contener varias URLs separadas por comas (p. ej. la URL
 * interna por IP y el dominio público). Esta utilidad es la única fuente de
 * verdad para obtener la base correcta y evitar que los enlaces de correo se
 * generen concatenando toda la lista.
 *
 * Estrategia de resolución cuando hay `req`:
 *   1. Cabecera Origin (típica en llamadas CORS del cliente).
 *   2. Cabecera Referer.
 *   3. Cabeceras Host / Proto (con soporte para proxies vía X-Forwarded-*).
 * Si alguna coincide con una URL configurada, se prefiere el valor configurado.
 * Como último recurso se usa la primera URL declarada en el entorno.
 */
const parseConfiguredUrls = (): string[] => {
  const envBase = process.env.FRONTEND_URL?.trim() || '';
  return envBase
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

const findConfiguredMatch = (urls: string[], candidateOrigin: string): string | undefined =>
  urls.find((url) => url.toLowerCase().startsWith(candidateOrigin.toLowerCase()));

export const getFrontendBaseUrl = (req?: Request): string => {
  const urls = parseConfiguredUrls();

  if (req) {
    // 1. Cabecera Origin (enviada típicamente en llamadas CORS del cliente).
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      return (findConfiguredMatch(urls, origin) || origin).replace(/\/$/, '');
    }

    // 2. Cabecera Referer.
    const referer = req.headers.referer as string | undefined;
    if (referer) {
      try {
        const originFromRef = new URL(referer).origin;
        return (findConfiguredMatch(urls, originFromRef) || originFromRef).replace(/\/$/, '');
      } catch {
        // Se ignora un referer inválido o malicioso y se continúa con las siguientes estrategias.
      }
    }

    // 3. Cabeceras Host / Proto (incluye soporte para proxies).
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    if (host) {
      const generatedUrl = `${protocol}://${host}`;
      return (findConfiguredMatch(urls, generatedUrl) || generatedUrl).replace(/\/$/, '');
    }
  }

  const defaultUrl = urls[0];
  if (defaultUrl) {
    return defaultUrl;
  }

  throw new Error(
    'FRONTEND_URL no está definido en las variables de entorno y no se pudo determinar desde la petición.'
  );
};

export const buildVerifyLink = (token: string, email: string, req?: Request): string => {
  const base = getFrontendBaseUrl(req);
  return `${base}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
};

export const buildResetLink = (token: string, email: string, req?: Request): string => {
  const base = getFrontendBaseUrl(req);
  return `${base}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
};
