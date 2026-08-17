import { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { logger } from '../config/logger';
import { readPositiveInt } from '../utils/envVars';

/**
 * Limites dedicados al grupo de recuperacion de contrasena.
 *
 * El limitador global de server.ts es deliberadamente generoso porque debe dar cabida a la
 * navegacion normal del SPA: con su presupuesto, un atacante consigue un centenar de correos
 * de restablecimiento al mismo buzon cada ventana. Endurecer ese limite global no es opcion
 * porque romperia la aplicacion, asi que este grupo necesita su propio presupuesto.
 *
 * Se limita en dos dimensiones porque cada una cubre lo que la otra no puede:
 *  - Por IP frena el abuso desde un mismo origen, incluso con peticiones malformadas.
 *  - Por cuenta frena la inundacion del buzon de una victima concreta cuando el atacante
 *    rota direcciones IP, escenario en el que el limite por IP no aporta nada.
 *
 * El almacen es en memoria, por lo que los contadores son por proceso. Un despliegue con
 * varias instancias detras del balanceador multiplica los limites efectivos por el numero de
 * replicas y necesitaria un almacen compartido (Redis) para ser exacto.
 */

const IP_WINDOW_MS = readPositiveInt('PASSWORD_RECOVERY_WINDOW_MS', 15 * 60 * 1000);
const IP_MAX_REQUESTS = readPositiveInt('PASSWORD_RECOVERY_MAX_PER_IP', 5);
const ACCOUNT_WINDOW_MS = readPositiveInt('PASSWORD_RECOVERY_ACCOUNT_WINDOW_MS', 60 * 60 * 1000);
const ACCOUNT_MAX_REQUESTS = readPositiveInt('PASSWORD_RECOVERY_MAX_PER_ACCOUNT', 3);
const TOKEN_ATTEMPT_MAX_REQUESTS = readPositiveInt('PASSWORD_RECOVERY_MAX_TOKEN_ATTEMPTS', 10);

/**
 * Clave por cuenta destino. Cuando la peticion no trae un correo utilizable se cae a la
 * clave por IP para no agrupar peticiones ajenas bajo un mismo contador compartido.
 */
export const accountKeyFromRequest = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof email === 'string' && email.trim()) {
    return `account:${email.trim().toLowerCase()}`;
  }

  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
};

/**
 * El motivo del rechazo nunca revela si la cuenta existe: el contador se indexa por el correo
 * recibido, no por el encontrado en base de datos, de modo que la respuesta es identica para
 * una cuenta real y para una inexistente.
 */
const buildLimitReachedHandler = (scope: string) => (req: Request, res: Response): void => {
  logger.warn(
    `[Recuperacion] Limite de solicitudes alcanzado (${scope}) en ${req.originalUrl} desde ${req.ip}`
  );

  res.status(429).json({
    success: false,
    error: 'Demasiadas solicitudes de recuperacion. Espera unos minutos antes de intentarlo de nuevo.',
    message: 'Demasiadas solicitudes de recuperacion. Espera unos minutos antes de intentarlo de nuevo.'
  });
};

/** Inundaciones desde un mismo origen, contando tambien las peticiones malformadas. */
export const passwordRecoveryIpLimiter = rateLimit({
  windowMs: IP_WINDOW_MS,
  limit: IP_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildLimitReachedHandler('por IP')
});

/**
 * Inundacion del buzon de una victima concreta. Debe montarse despues de la cadena de
 * validacion para que la clave use el correo ya normalizado y no se pueda multiplicar el
 * presupuesto con variantes equivalentes de la misma direccion.
 */
export const passwordRecoveryAccountLimiter = rateLimit({
  windowMs: ACCOUNT_WINDOW_MS,
  limit: ACCOUNT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKeyFromRequest,
  handler: buildLimitReachedHandler('por cuenta')
});

/**
 * Intentos de adivinar un token. Solo se contabilizan los fallos: quien llega con un enlace
 * legitimo no debe gastar presupuesto por verificarlo y usarlo.
 */
export const resetTokenAttemptLimiter = rateLimit({
  windowMs: IP_WINDOW_MS,
  limit: TOKEN_ATTEMPT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: buildLimitReachedHandler('intentos de token')
});
