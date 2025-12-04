import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse, RegisterRequest, UserRole } from '../models/user.model';
import { ApiResponse } from '../models/common.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Relative path so it works in dev/prod behind proxy
  private readonly API_URL = '/api/auth';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.restoreSessionFromStorage();
  }

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setSession(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  register(userData: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.API_URL}/register`, userData)
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/refresh`, {})
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setSession(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  validateSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.get<ApiResponse<User>>(`${this.API_URL}/me`).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data);
        } else {
          this.logout();
        }
      }),
      map(response => Boolean(response.success && response.data)),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  private setSession(authResult: LoginResponse): void {
    const expiresAt = Date.now() + (authResult.expiresIn * 1000);
    
    localStorage.setItem('token', authResult.token);
    localStorage.setItem('user', JSON.stringify(authResult.user));
    localStorage.setItem('tokenExpiry', expiresAt.toString());
    
    this.tokenSubject.next(authResult.token);
    this.currentUserSubject.next(authResult.user);
  }

  isLoggedIn(): boolean {
    const expiry = localStorage.getItem('tokenExpiry');
    const token = localStorage.getItem('token');
    if (!expiry || !token) return false;
    
    return Date.now() < Number.parseInt(expiry);
  }

  isTokenExpired(): boolean {
    return !this.isLoggedIn();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value ?? localStorage.getItem('token');
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isLeader(): boolean {
    return this.hasRole(UserRole.LIDER);
  }

  isTechnician(): boolean {
    return this.hasRole(UserRole.TECNICO);
  }

  isReader(): boolean {
    return this.hasRole(UserRole.READER);
  }

  canManageUsers(): boolean {
    const user = this.getCurrentUser();
    return user ? [UserRole.ADMIN, UserRole.LIDER].includes(user.role) : false;
  }

  canManageCertifications(): boolean {
    const user = this.getCurrentUser();
    return user ? [UserRole.ADMIN, UserRole.LIDER, UserRole.TECNICO].includes(user.role) : false;
  }

  canViewUsers(): boolean {
    const user = this.getCurrentUser();
    return user ? [UserRole.ADMIN, UserRole.LIDER, UserRole.TECNICO, UserRole.READER].includes(user.role) : false;
  }

  canCreateUsers(): boolean {
    const user = this.getCurrentUser();
    return user ? [UserRole.ADMIN, UserRole.LIDER].includes(user.role) : false;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Actualizar perfil de usuario
  updateProfile(userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/profile`, userData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setCurrentUser(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  // Cambiar contraseña
  // changePassword(passwordData: { currentPassword: string; newPassword: string }): Observable<ApiResponse<any>> {
  //   return this.http.put<ApiResponse<any>>(`${this.API_URL}/change-password`, passwordData)
  //     .pipe(catchError(this.handleError));
  // }

  // updateProfile(userData: Partial<User>): Observable<ApiResponse<User>> {
  //   return this.http.put<ApiResponse<User>>(`${this.API_URL}/profile`, userData)
  //     .pipe(
  //       tap(response => {
  //         if (response.success && response.data) {
  //           // Actualizar usuario en el estado
  //           this.currentUserSubject.next(response.data);
  //         }
  //       }),
  //       catchError(this.handleError)
  //     );
  // }

  // Cambiar contraseña
  changePassword(passwordData: { currentPassword: string; newPassword: string }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/change-password`, passwordData)
      .pipe(catchError(this.handleError));
  }

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(user);
  }

  private restoreSessionFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const expiry = localStorage.getItem('tokenExpiry');

    const expiryTime = expiry ? Number.parseInt(expiry) : NaN;
    const isSessionValid = token && expiry && !Number.isNaN(expiryTime) && Date.now() < expiryTime;

    if (isSessionValid && user) {
      try {
        this.tokenSubject.next(token);
        this.currentUserSubject.next(JSON.parse(user));
        return;
      } catch {
        // Si falla el parseo, limpiar la sesión corrupta
      }
    }

    this.logout();
  }
}
