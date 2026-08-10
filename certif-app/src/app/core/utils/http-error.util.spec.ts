import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, extractHttpErrorMessage, handleBlobError, toApiError } from './http-error.util';

const httpError = (status: number, body: unknown, statusText = 'Error'): HttpErrorResponse =>
  new HttpErrorResponse({ status, statusText, error: body });

describe('extractHttpErrorMessage', () => {
  it('prioriza el mensaje devuelto por la API', () => {
    const error = httpError(400, { message: 'El enlace de restablecimiento expiró.' });

    expect(extractHttpErrorMessage(error)).toBe('El enlace de restablecimiento expiró.');
  });

  it('usa el campo error cuando no viene message', () => {
    const error = httpError(400, { error: 'employeeId invalido' });

    expect(extractHttpErrorMessage(error)).toBe('employeeId invalido');
  });

  it('describe la falta de conexión ante un status 0', () => {
    expect(extractHttpErrorMessage(httpError(0, null))).toContain('No pudimos conectarnos');
  });

  it('concatena los detalles de validación cuando la API los envía', () => {
    const error = httpError(400, {
      message: 'Datos invalidos',
      details: [{ msg: 'El email es requerido' }, { msg: 'La contraseña es muy corta' }]
    });

    expect(extractHttpErrorMessage(error)).toBe(
      'Datos invalidos: El email es requerido, La contraseña es muy corta'
    );
  });

  it('no expone el detalle interno de un error del servidor', () => {
    const error = httpError(500, { message: 'MongoServerError: E11000 duplicate key' });

    expect(extractHttpErrorMessage(error)).toBe('Tuvimos un problema temporal. Intenta de nuevo en unos minutos.');
  });

  it('resuelve un mensaje aun sin cuerpo en la respuesta', () => {
    expect(extractHttpErrorMessage(httpError(418, null, 'Soy una tetera'))).toContain('418');
  });
});

describe('toApiError', () => {
  it('conserva el código reason emitido por el backend', () => {
    const error = httpError(400, { message: 'El enlace expiró.', reason: 'TOKEN_EXPIRED' });

    const apiError = toApiError(error);

    expect(apiError.message).toBe('El enlace expiró.');
    expect(apiError.reason).toBe('TOKEN_EXPIRED');
  });

  it('deja reason indefinido cuando la respuesta no lo declara', () => {
    expect(toApiError(httpError(404, { message: 'No encontrado' })).reason).toBeUndefined();
  });

  it('devuelve una instancia de Error utilizable por los suscriptores', () => {
    expect(toApiError(httpError(403, { error: 'Sin permisos' }))).toEqual(jasmine.any(Error));
  });

  it('no recupera el mensaje cuando el cuerpo del error llega como Blob', () => {
    // toApiError es sincrónico y no puede leer el Blob; para eso existe handleBlobError.
    const error = httpError(404, new Blob([JSON.stringify({ message: 'No hay archivos' })]));

    expect(toApiError(error).message).not.toBe('No hay archivos');
  });
});

describe('handleBlobError', () => {
  const expectError = (error: HttpErrorResponse): Promise<ApiError> =>
    new Promise((resolve, reject) => {
      handleBlobError(error).subscribe({
        next: () => reject(new Error('No debería emitir un valor')),
        error: (err: ApiError) => resolve(err)
      });
    });

  it('recupera el mensaje del backend desde un cuerpo Blob (regresión ISS-027)', async () => {
    const body = new Blob([JSON.stringify({ error: 'No se encontraron archivos de certificaciones' })]);

    const apiError = await expectError(httpError(404, body));

    expect(apiError.message).toBe('No se encontraron archivos de certificaciones');
  });

  it('conserva el reason cuando el backend lo declara', async () => {
    const body = new Blob([JSON.stringify({ message: 'El enlace expiró.', reason: 'TOKEN_EXPIRED' })]);

    const apiError = await expectError(httpError(400, body));

    expect(apiError.reason).toBe('TOKEN_EXPIRED');
  });

  it('recurre al mensaje genérico si el cuerpo no es JSON', async () => {
    const apiError = await expectError(httpError(500, new Blob(['<html>error</html>'])));

    expect(apiError.message).toBe('Tuvimos un problema temporal. Intenta de nuevo en unos minutos.');
  });

  it('funciona igual cuando el error no viene como Blob', async () => {
    const apiError = await expectError(httpError(403, { error: 'Sin permisos' }));

    expect(apiError.message).toBe('Sin permisos');
  });
});
