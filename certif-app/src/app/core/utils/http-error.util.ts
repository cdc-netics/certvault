import { HttpErrorResponse } from '@angular/common/http';

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
