import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const targetUrl = state.url;

    // Función auxiliar para determinar si se permite el paso o se redirige
    const checkPasswordChange = (user: any): boolean => {
      if (user && user.mustChangePassword) {
        if (targetUrl !== '/force-password-change') {
          // Redirigir de forma obligatoria al formulario de cambio de clave forzado
          this.router.navigate(['/force-password-change']);
          return false;
        }
        return true;
      }
      
      // Si el usuario no requiere cambiar contraseña pero intenta ingresar al formulario forzado
      if (targetUrl === '/force-password-change') {
        this.router.navigate(['/dashboard']);
        return false;
      }
      return true;
    };

    if (this.authService.isLoggedIn() && this.authService.getCurrentUser()) {
      const user = this.authService.getCurrentUser();
      return of(checkPasswordChange(user));
    }

    return this.authService.validateSession().pipe(
      map(isValid => {
        if (isValid) {
          const user = this.authService.getCurrentUser();
          return checkPasswordChange(user);
        } else {
          this.authService.logout();
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && this.authService.isLoggedIn() && this.authService.isAdmin()) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class LeaderGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && this.authService.isLoggedIn() && 
            (this.authService.isAdmin() || this.authService.isLeader())) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        const allowedRoles = [UserRole.ADMIN, UserRole.LIDER, UserRole.TECNICO];
        
        if (user && this.authService.isLoggedIn() && allowedRoles.includes(user.role)) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class UsersGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && this.authService.isLoggedIn() && this.authService.canViewUsers()) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }
}
