import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';

/**
 * Pruebas unitarias del flujo "olvidaste tu contrasena": solicitud del enlace, verificacion del
 * enlace y consumo del enlace. Se aislan las dependencias de infraestructura (modelo, correo,
 * politica del servidor) para poder ejercitar las reglas del controlador de forma determinista.
 *
 * El hasheo real de la contrasena ocurre en el hook pre('save') del modelo y queda fuera de
 * estas pruebas: aqui solo se comprueba que el controlador asigna la contrasena en claro para
 * que ese hook la procese.
 */
jest.mock('../models/User', () => ({
  User: { findOne: jest.fn() },
  UserRole: { ADMIN: 'admin', READER: 'reader', TECNICO: 'tecnico', LIDER: 'lider' }
}));

jest.mock('../services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn()
}));

jest.mock('../services/serverPolicyService', () => ({
  getResolvedServerPolicy: jest.fn()
}));

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// El controlador arrastra la verificacion de Azure AD, cuya cadena de dependencias (jwks-rsa
// -> jose) se publica como ESM y Jest no puede transformar. No participa en este flujo.
jest.mock('../utils/azureToken', () => ({ verifyAzureIdToken: jest.fn() }));

import { User } from '../models/User';
import { sendPasswordResetEmail } from '../services/emailService';
import { getResolvedServerPolicy } from '../services/serverPolicyService';
import { forgotPassword, resetPassword, verifyResetToken } from './authController';

const findOneMock = User.findOne as jest.Mock;
const sendPasswordResetEmailMock = sendPasswordResetEmail as jest.Mock;
const getResolvedServerPolicyMock = getResolvedServerPolicy as jest.Mock;

/** Vigencia por defecto del enlace, en minutos (RESET_PASSWORD_EXPIRE_MINUTES). */
const DEFAULT_EXPIRE_MINUTES = 60;
const NOW = new Date('2026-08-17T12:00:00.000Z');

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

interface FakeUser {
  _id: string;
  email: string;
  personalEmail?: string;
  username: string;
  firstName: string;
  password?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  mustChangePassword?: boolean;
  save: jest.Mock;
}

const buildUser = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  _id: 'user-1',
  email: 'persona@empresa.com',
  personalEmail: 'persona.personal@gmail.com',
  username: 'persona',
  firstName: 'Persona',
  password: 'hash-anterior',
  mustChangePassword: true,
  refreshToken: 'refresh-anterior',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

/**
 * El controlador usa el resultado de findOne de dos formas: lo espera directamente o le encadena
 * .select('+password'). El doble replica ambas rutas con un thenable reutilizable.
 */
interface FakeQuery {
  select: jest.Mock;
  then: (
    onFulfilled: (value: FakeUser | null) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>;
}

const buildQuery = (result: FakeUser | null): FakeQuery => {
  const query: FakeQuery = {
    select: jest.fn(() => query),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)
  };
  return query;
};

type FakeResponse = Response & { statusCode: number; status: jest.Mock; json: jest.Mock };

const buildResponse = (): FakeResponse => {
  const res = { statusCode: 200 } as unknown as FakeResponse;
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn(() => res);
  return res;
};

const lastJsonPayload = (res: FakeResponse): Record<string, unknown> => {
  const { calls } = res.json.mock;
  return calls.length ? calls[calls.length - 1][0] : {};
};

/**
 * Doble minimo de Request. Incluye protocol/get porque buildResetLink resuelve la base del
 * enlace a partir de las cabeceras y del host de la peticion.
 */
const buildRequest = (body: unknown): AuthRequest =>
  ({
    body,
    headers: {},
    protocol: 'https',
    get: () => undefined
  } as unknown as AuthRequest);

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  // buildResetLink exige una base declarada; sin ella lanzaria por configuracion ausente.
  process.env.FRONTEND_URL = 'https://certvault.netics.corp';
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  getResolvedServerPolicyMock.mockResolvedValue({ requirePersonalEmail: true, sendBackupOnDelete: true });
  sendPasswordResetEmailMock.mockResolvedValue(undefined);
});

describe('forgotPassword', () => {
  it('rechaza la solicitud sin correo', async () => {
    const res = buildResponse();

    await forgotPassword(buildRequest({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('normaliza el correo antes de buscarlo', async () => {
    findOneMock.mockReturnValue(buildQuery(null));

    await forgotPassword(buildRequest({ email: '  Persona@Empresa.COM ' }), buildResponse());

    expect(findOneMock).toHaveBeenCalledWith({ email: 'persona@empresa.com' });
  });

  it('responde con exito y sin enviar correo cuando la cuenta no existe', async () => {
    findOneMock.mockReturnValue(buildQuery(null));
    const res = buildResponse();

    await forgotPassword(buildRequest({ email: 'fantasma@empresa.com' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(lastJsonPayload(res).success).toBe(true);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  // Una respuesta distinta para cuenta existente e inexistente convertiria el endpoint en un
  // enumerador de correos validos del dominio.
  it('responde exactamente igual exista o no la cuenta', async () => {
    findOneMock.mockReturnValue(buildQuery(null));
    const resDesconocida = buildResponse();
    await forgotPassword(buildRequest({ email: 'fantasma@empresa.com' }), resDesconocida);

    findOneMock.mockReturnValue(buildQuery(buildUser()));
    const resConocida = buildResponse();
    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), resConocida);

    expect(lastJsonPayload(resConocida)).toEqual(lastJsonPayload(resDesconocida));
    expect(resConocida.status).not.toHaveBeenCalled();
    expect(resDesconocida.status).not.toHaveBeenCalled();
  });

  it('envia el enlace y persiste la solicitud cuando la cuenta existe', async () => {
    const user = buildUser();
    findOneMock.mockReturnValue(buildQuery(user));

    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), buildResponse());

    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: user.email, name: 'Persona', expiresInMinutes: DEFAULT_EXPIRE_MINUTES })
    );
  });

  // Invariante central del diseno: una filtracion de la coleccion de usuarios no debe permitir
  // forjar enlaces, asi que en base de datos solo puede quedar el hash del token.
  it('almacena el hash del token, nunca el token que viaja en el enlace', async () => {
    const user = buildUser();
    findOneMock.mockReturnValue(buildQuery(user));

    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), buildResponse());

    const { resetLink } = sendPasswordResetEmailMock.mock.calls[0][0];
    const tokenEnElEnlace = new URL(resetLink).searchParams.get('token') as string;

    expect(tokenEnElEnlace).toMatch(/^[a-f0-9]{64}$/);
    expect(user.passwordResetToken).toBe(sha256(tokenEnElEnlace));
    expect(user.passwordResetToken).not.toBe(tokenEnElEnlace);
  });

  it('fija la expiracion segun la vigencia configurada', async () => {
    const user = buildUser();
    findOneMock.mockReturnValue(buildQuery(user));

    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), buildResponse());

    expect(user.passwordResetExpires?.getTime()).toBe(NOW.getTime() + DEFAULT_EXPIRE_MINUTES * 60 * 1000);
  });

  it('genera un token distinto en cada solicitud', async () => {
    const primero = buildUser();
    findOneMock.mockReturnValue(buildQuery(primero));
    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), buildResponse());

    const segundo = buildUser();
    findOneMock.mockReturnValue(buildQuery(segundo));
    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), buildResponse());

    expect(primero.passwordResetToken).not.toBe(segundo.passwordResetToken);
  });

  /**
   * Comportamiento pendiente (hallazgo #2): hoy un fallo del SMTP escapa sin capturar y produce
   * un 500, mientras que una cuenta inexistente responde 200. Ese contraste revela que el correo
   * existe. `it.failing` deja el hueco registrado y hara fallar la suite cuando se corrija, para
   * que esta prueba se convierta en `it`.
   */
  it.failing('no debe revelar la existencia de la cuenta cuando falla el envio', async () => {
    findOneMock.mockReturnValue(buildQuery(buildUser()));
    sendPasswordResetEmailMock.mockRejectedValue(new Error('SMTP caido'));
    const res = buildResponse();

    await forgotPassword(buildRequest({ email: 'persona@empresa.com' }), res);

    expect(res.statusCode).toBe(200);
    expect(lastJsonPayload(res).success).toBe(true);
  });
});

describe('verifyResetToken', () => {
  const buildPlainRequest = (body: unknown): Request => ({ body } as Request);

  it('rechaza la peticion sin token', async () => {
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('busca por el hash del token recibido, no por el token en claro', async () => {
    findOneMock.mockReturnValue(buildQuery(null));

    await verifyResetToken(buildPlainRequest({ token: 'tok-en-claro' }), buildResponse());

    expect(findOneMock).toHaveBeenCalledWith({ passwordResetToken: sha256('tok-en-claro') });
  });

  it('acota la busqueda al correo cuando el enlace lo incluye', async () => {
    findOneMock.mockReturnValue(buildQuery(null));

    await verifyResetToken(buildPlainRequest({ token: 'tok', email: 'Persona@Empresa.com' }), buildResponse());

    expect(findOneMock).toHaveBeenCalledWith({
      passwordResetToken: sha256('tok'),
      email: 'persona@empresa.com'
    });
  });

  it('distingue un enlace inexistente con TOKEN_INVALID', async () => {
    findOneMock.mockReturnValue(buildQuery(null));
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lastJsonPayload(res).reason).toBe('TOKEN_INVALID');
  });

  // Distinguir vencido de invalido es lo que permite al cliente ofrecer "solicitar otro enlace"
  // en lugar del mensaje unico que impedia diagnosticar la falla (ISS-025).
  it('distingue un enlace vencido con TOKEN_EXPIRED', async () => {
    findOneMock.mockReturnValue(
      buildQuery(buildUser({ passwordResetExpires: new Date(NOW.getTime() - 1000) }))
    );
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lastJsonPayload(res).reason).toBe('TOKEN_EXPIRED');
  });

  it('trata como vencido un enlace sin fecha de expiracion', async () => {
    findOneMock.mockReturnValue(buildQuery(buildUser({ passwordResetExpires: undefined })));
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect(lastJsonPayload(res).reason).toBe('TOKEN_EXPIRED');
  });

  it('acepta un enlace vigente e informa el correo asociado', async () => {
    findOneMock.mockReturnValue(
      buildQuery(buildUser({ passwordResetExpires: new Date(NOW.getTime() + 60_000) }))
    );
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(lastJsonPayload(res).data).toEqual({
      valid: true,
      email: 'persona@empresa.com',
      requiresPersonalEmail: false
    });
  });

  it('exige correo personal cuando la politica lo pide y el usuario no lo tiene', async () => {
    findOneMock.mockReturnValue(
      buildQuery(
        buildUser({
          passwordResetExpires: new Date(NOW.getTime() + 60_000),
          personalEmail: undefined
        })
      )
    );
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect((lastJsonPayload(res).data as { requiresPersonalEmail: boolean }).requiresPersonalEmail).toBe(true);
  });

  it('no exige correo personal cuando la politica esta desactivada', async () => {
    getResolvedServerPolicyMock.mockResolvedValue({ requirePersonalEmail: false, sendBackupOnDelete: true });
    findOneMock.mockReturnValue(
      buildQuery(
        buildUser({
          passwordResetExpires: new Date(NOW.getTime() + 60_000),
          personalEmail: undefined
        })
      )
    );
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect((lastJsonPayload(res).data as { requiresPersonalEmail: boolean }).requiresPersonalEmail).toBe(false);
  });

  it('responde 500 sin filtrar el detalle interno si la consulta falla', async () => {
    findOneMock.mockImplementation(() => {
      throw new Error('fallo de conexion a mongo');
    });
    const res = buildResponse();

    await verifyResetToken(buildPlainRequest({ token: 'tok' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(lastJsonPayload(res))).not.toContain('mongo');
  });
});

describe('resetPassword', () => {
  const vigente = () => new Date(NOW.getTime() + 60_000);

  it.each([
    ['sin token', { newPassword: 'NuevaClave1' }],
    ['sin contrasena nueva', { token: 'tok' }]
  ])('rechaza la peticion %s', async (_caso, body) => {
    const res = buildResponse();

    await resetPassword(buildRequest(body), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('rechaza una contrasena mas corta que el minimo', async () => {
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: '12345' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('selecciona la contrasena actual para poder reemplazarla', async () => {
    const query = buildQuery(buildUser({ passwordResetExpires: vigente() }));
    findOneMock.mockReturnValue(query);

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), buildResponse());

    expect(query.select).toHaveBeenCalledWith('+password');
  });

  it.each([
    ['inexistente', null, 'TOKEN_INVALID'],
    ['vencido', buildUser({ passwordResetExpires: new Date(NOW.getTime() - 1000) }), 'TOKEN_EXPIRED']
  ])('rechaza un enlace %s con el motivo %s', async (_caso, user, expectedReason) => {
    findOneMock.mockReturnValue(buildQuery(user as FakeUser | null));
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lastJsonPayload(res).reason).toBe(expectedReason);
  });

  it('actualiza la contrasena e invalida el enlace y la sesion previa', async () => {
    const user = buildUser({ passwordResetExpires: vigente() });
    findOneMock.mockReturnValue(buildQuery(user));
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(lastJsonPayload(res).success).toBe(true);
    // La contrasena se asigna en claro a proposito: el hook pre('save') del modelo la hashea.
    expect(user.password).toBe('NuevaClave1');
    expect(user.passwordResetToken).toBeUndefined();
    expect(user.passwordResetExpires).toBeUndefined();
    expect(user.refreshToken).toBeUndefined();
    expect(user.mustChangePassword).toBe(false);
    // Sin desactivar la validacion: el guardado debe pasar por el esquema completo.
    expect(user.save).toHaveBeenCalledWith();
  });

  it('exige el correo personal cuando la politica lo pide y el usuario no lo tiene', async () => {
    const user = buildUser({ passwordResetExpires: vigente(), personalEmail: undefined });
    findOneMock.mockReturnValue(buildQuery(user));
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lastJsonPayload(res).reason).toBe('PERSONAL_EMAIL_REQUIRED');
    expect(user.save).not.toHaveBeenCalled();
  });

  it('rechaza un correo personal identico al corporativo', async () => {
    const user = buildUser({ passwordResetExpires: vigente(), personalEmail: undefined });
    findOneMock.mockReturnValue(buildQuery(user));
    const res = buildResponse();

    await resetPassword(
      buildRequest({ token: 'tok', newPassword: 'NuevaClave1', personalEmail: 'Persona@Empresa.com' }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.save).not.toHaveBeenCalled();
  });

  it('guarda el correo personal normalizado cuando la politica lo exige', async () => {
    const user = buildUser({ passwordResetExpires: vigente(), personalEmail: undefined });
    findOneMock.mockReturnValue(buildQuery(user));

    await resetPassword(
      buildRequest({
        token: 'tok',
        newPassword: 'NuevaClave1',
        personalEmail: '  Respaldo@Gmail.com '
      }),
      buildResponse()
    );

    expect(user.personalEmail).toBe('respaldo@gmail.com');
    expect(user.save).toHaveBeenCalled();
  });

  /**
   * El criterio debe coincidir con verifyResetToken: con la politica desactivada el formulario
   * nunca muestra el campo, asi que exigirlo aqui mataria el envio con un 400 pese a tener un
   * token valido (regresion ISS-025).
   */
  it('no exige correo personal cuando la politica esta desactivada', async () => {
    getResolvedServerPolicyMock.mockResolvedValue({ requirePersonalEmail: false, sendBackupOnDelete: true });
    const user = buildUser({ passwordResetExpires: vigente(), personalEmail: undefined });
    findOneMock.mockReturnValue(buildQuery(user));
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(user.password).toBe('NuevaClave1');
  });

  it('responde 500 sin filtrar el detalle interno si el guardado falla', async () => {
    const user = buildUser({ passwordResetExpires: vigente() });
    user.save.mockRejectedValue(new Error('fallo de conexion a mongo'));
    findOneMock.mockReturnValue(buildQuery(user));
    const res = buildResponse();

    await resetPassword(buildRequest({ token: 'tok', newPassword: 'NuevaClave1' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(lastJsonPayload(res))).not.toContain('mongo');
  });
});
