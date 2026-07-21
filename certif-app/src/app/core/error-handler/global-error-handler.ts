import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { NotificationService } from '../services/notification.service';

/**
 * Captura excepciones de runtime no manejadas por ningun try/catch o catchError.
 * Usa Injector en vez de inyeccion directa por constructor porque ErrorHandler
 * se instancia antes que el resto de los providers de la aplicacion.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    console.error('Error no controlado en la aplicacion:', error);

    const notificationService = this.injector.get(NotificationService);
    notificationService.error('Ocurrio un error inesperado en la aplicacion.');
  }
}
