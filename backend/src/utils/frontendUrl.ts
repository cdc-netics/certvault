import { Request } from 'express';

/**
 * Resuelve la URL base del frontend de forma robusta y centralizada.
 *
 * `FRONTEND_URL` puede contener varias URLs separadas por comas (p. ej. la URL
 * interna por IP y el dominio público). Esta utilidad es la única fuente de
 * verdad para obtener la base correcta y evitar que los enlaces de correo se
 * generen concatenando toda la lista.
 *
 * Precedencia (ISS-025): un enlace enviado por correo se abre desde el cliente
 * del destinatario, fuera del contexto de la petición que lo originó. Por eso la
 * base debe ser siempre una URL declarada en el entorno; las cabeceras de la
 * petición solo sirven para elegir CUÁL de las URLs configuradas usar cuando hay
 * varias, nunca para introducir un host ajeno a la configuración. Sin esta
 * restricción, detrás del proxy inverso el enlace se generaba con la IP y el
 * puerto internos del contenedor, inalcanzables para quien recibe el correo.
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

/** Las cabeceras X-Forwarded-* pueden acumular varios valores al atravesar más de un proxy. */
const firstForwardedValue = (headerValue?: string): string | undefined =>
  headerValue?.split(',')[0]?.trim() || undefined;

/** Origen declarado por la petición, en orden de fiabilidad: Origin, Referer y Host/Proto. */
const resolveRequestOrigin = (req: Request): string | undefined => {
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  const referer = req.headers.referer as string | undefined;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Se ignora un referer inválido o malicioso y se continúa con las siguientes estrategias.
    }
  }

  const protocol = firstForwardedValue(req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = firstForwardedValue(req.headers['x-forwarded-host'] as string) || req.get('host');
  return host ? `${protocol}://${host}` : undefined;
};

export const getFrontendBaseUrl = (req?: Request): string => {
  const configuredUrls = parseConfiguredUrls();
  const requestOrigin = req ? resolveRequestOrigin(req) : undefined;

  if (requestOrigin) {
    const configuredMatch = findConfiguredMatch(configuredUrls, requestOrigin);
    if (configuredMatch) {
      return configuredMatch;
    }
  }

  const [defaultUrl] = configuredUrls;
  if (defaultUrl) {
    return defaultUrl;
  }

  // Sin URLs declaradas (típicamente desarrollo local) se acepta el origen de la petición.
  if (requestOrigin) {
    return requestOrigin;
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
