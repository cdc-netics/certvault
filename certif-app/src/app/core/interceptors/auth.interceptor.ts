import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { extractHttpErrorMessage } from '../utils/http-error.util';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const token = authService.getToken();

  const authReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        notificationService.info('Tu sesion expiro o las credenciales no son validas. Vuelve a iniciar sesion.');
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 0 || error.status === 403 || error.status >= 500) {
        // Errores de infraestructura (red, backend caido, permisos globales) se notifican
        // de forma centralizada porque no todos los componentes consumidores los manejan.
        notificationService.error(extractHttpErrorMessage(error));
      }
      return throwError(() => error);
    })
  );
};
