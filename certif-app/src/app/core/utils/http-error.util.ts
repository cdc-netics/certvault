import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, switchMap, throwError } from 'rxjs';

/**
 * Error de aplicacion que conserva el codigo `reason` emitido por el backend, de modo que
 * la vista pueda reaccionar al motivo concreto y no solo mostrar el mensaje generico.
 */
export interface ApiError extends Error {
  reason?: string;
}

/** Construye un ApiError a partir de la respuesta HTTP, preservando el motivo del rechazo. */
export function toApiError(error: HttpErrorResponse): ApiError {
  const apiError: ApiError = new Error(extractHttpErrorMessage(error));
  apiError.reason = error.error?.reason;
  return apiError;
}

/**
 * Manejador de errores para las peticiones con `responseType: 'blob'`.
 *
 * Ese tipo de respuesta se aplica tambien a los errores, de modo que el cuerpo JSON del
 * backend llega como `Blob` y el extractor no encuentra ni el mensaje ni el `reason`: la
 * vista mostraba el texto generico del status en lugar del motivo real (ISS-027). Aqui se
 * lee el blob como texto, se interpreta como JSON y se reconstruye el ApiError.
 */
export function handleBlobError(error: HttpErrorResponse): Observable<never> {
  if (!(error.error instanceof Blob)) {
    return throwError(() => toApiError(error));
  }

  return from(error.error.text()).pipe(
    switchMap((text) => {
      let parsed: { message?: string; error?: string; reason?: string } | null = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // El cuerpo no era JSON: se conserva el mensaje generico del extractor.
      }

      const rebuilt = new HttpErrorResponse({
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
        error: parsed ?? null
      });

      return throwError(() => toApiError(rebuilt));
    })
  );
}

/**
 * Extrae un mensaje de error legible para el usuario a partir de un HttpErrorResponse.
 * Centraliza la logica que antes estaba duplicada en cada servicio HTTP.
 */
export function extractHttpErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return `Error: ${error.error.message}`;
  }

  const apiMessage = error.error?.message || error.error?.error;
  const status = error.status;

  if (status === 0) {
    return 'No pudimos conectarnos con el servidor. Verifica tu conexion o intenta mas tarde.';
  }

  if (status === 400) {
    // Si el backend retorna una lista detallada de errores de validacion (p. ej., express-validator)
    // se formatean dichos mensajes para brindar feedback claro al usuario sobre que campos fallaron.
    if (error.error?.details && Array.isArray(error.error.details)) {
      const detailsMsg = error.error.details.map((d: any) => d.msg).join(', ');
      return `${apiMessage || 'Datos de entrada invalidos'}: ${detailsMsg}`;
    }
    return apiMessage || 'Revisa los datos ingresados e intenta nuevamente.';
  }

  if (status === 401) {
    return apiMessage || 'Tu sesion expiro o las credenciales no son validas.';
  }

  if (status >= 500) {
    return 'Tuvimos un problema temporal. Intenta de nuevo en unos minutos.';
  }

  return apiMessage || `Error ${error.status}: ${error.statusText || 'Ha ocurrido un error inesperado'}`;
}
