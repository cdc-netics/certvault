import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiResponse } from '../models/common.model';
import { SmtpProfile, SmtpProfilePayload } from '../models/smtp-profile.model';

export interface AuditLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userEmail?: string;
  from?: string;
  to?: string;
}

export interface BrandingSettings {
  _id?: string;
  appName: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarLogo?: string;
  loginLogo?: string;
  reportLogo?: string;
  reportFooter?: string;
}

export interface SecuritySettingsData {
  passwordExpirationEnabled: boolean;
  passwordExpirationMonths: number;
  certificateExpirationAlertsEnabled: boolean;
  adLoginEnabled: boolean;
  adProvider: 'ldap' | 'azure';
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  ldapUrl?: string;
  ldapBaseDN?: string;
  ldapBindDN?: string;
  ldapBindPassword?: string;
  // Propiedades de auto-backup
  autoBackupEnabled: boolean;
  autoBackupIntervalDays: number;
  lastAutoBackupAt?: string | Date;
}

export interface PublicApiClient {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  canReadCertifications: boolean;
  canDownloadFiles: boolean;
  rateLimitPerMinute: number;
  maxPageSize: number;
  keyHint?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  endpoint: string;
  downloadEndpointPattern: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly API_URL = '/api/settings';
  private readonly cacheTtlMs = 30000;
  private readonly cache = new Map<string, { expiresAt: number; response: ApiResponse<unknown> }>();

  private readonly brandingSubject = new BehaviorSubject<BrandingSettings | null>(null);
  public readonly branding$ = this.brandingSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  // Aplicar colores y configuraciones de branding dinámicamente en el DOM y navegador
  applyBranding(settings: BrandingSettings): void {
    this.brandingSubject.next(settings);

    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      // Generar y aplicar un color de hover/active un poco más oscuro (-15% de brillo)
      document.documentElement.style.setProperty('--primary-dark', this.adjustColorBrightness(settings.primaryColor, -15));
    }
    if (settings.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    }
    if (settings.appName) {
      document.title = `${settings.appName} - Sistema de Certificaciones`;
    }
  }

  // Cargar el branding de la base de datos y aplicarlo dinámicamente
  loadAndApplyBranding(): Observable<ApiResponse<BrandingSettings>> {
    return this.getBranding().pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.applyBranding(response.data);
        }
      })
    );
  }

  // Utilidad para cambiar el brillo de un color en formato HEX
  private adjustColorBrightness(hex: string, percent: number): string {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, R + (R * percent) / 100));
    G = Math.max(0, Math.min(255, G + (G * percent) / 100));
    B = Math.max(0, Math.min(255, B + (B * percent) / 100));

    const rHex = Math.round(R).toString(16).padStart(2, '0');
    const gHex = Math.round(G).toString(16).padStart(2, '0');
    const bHex = Math.round(B).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  getSmtpProfiles(): Observable<ApiResponse<SmtpProfile[]>> {
    return this.cachedGet<SmtpProfile[]>('smtp-profiles', `${this.API_URL}/smtp-profiles`);
  }

  // Obtener la política SMTP activa respecto a la obligatoriedad del correo personal
  getActiveSmtpPolicy(): Observable<ApiResponse<{ requirePersonalEmail: boolean }>> {
    return this.http.get<ApiResponse<{ requirePersonalEmail: boolean }>>(`${this.API_URL}/smtp-policy`)
      .pipe(catchError(this.handleError));
  }

  createSmtpProfile(payload: SmtpProfilePayload): Observable<ApiResponse<SmtpProfile>> {
    return this.http.post<ApiResponse<SmtpProfile>>(`${this.API_URL}/smtp-profiles`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  updateSmtpProfile(id: string, payload: Partial<SmtpProfilePayload>): Observable<ApiResponse<SmtpProfile>> {
    return this.http.put<ApiResponse<SmtpProfile>>(`${this.API_URL}/smtp-profiles/${id}`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  deleteSmtpProfile(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/smtp-profiles/${id}`)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  activateSmtpProfile(id: string): Observable<ApiResponse<SmtpProfile>> {
    return this.http.post<ApiResponse<SmtpProfile>>(`${this.API_URL}/smtp-profiles/${id}/activate`, {})
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  deactivateSmtpProfile(id: string): Observable<ApiResponse<SmtpProfile>> {
    return this.http.post<ApiResponse<SmtpProfile>>(`${this.API_URL}/smtp-profiles/${id}/deactivate`, {})
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  testSmtpProfile(id: string, to?: string): Observable<ApiResponse<SmtpProfile>> {
    return this.http.post<ApiResponse<SmtpProfile>>(`${this.API_URL}/smtp-profiles/${id}/test`, { to })
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  getAuditLogs(query: AuditLogsQuery): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.cachedGet<any>(`audit-logs:${params.toString()}`, `${this.API_URL}/audit-logs`, params);
  }

  getBackupSummary(): Observable<ApiResponse<any>> {
    return this.cachedGet<any>('backup-summary', `${this.API_URL}/backup/summary`);
  }

  exportBackup(type: 'config' | 'full' = 'full'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/backup/export?type=${type}`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  importBackup(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/backup/import`, formData)
      .pipe(catchError(this.handleError));
  }

  systemWipe(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/backup/system-wipe`, {})
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  getBranding(): Observable<ApiResponse<BrandingSettings>> {
    return this.cachedGet<BrandingSettings>('branding', `${this.API_URL}/branding`);
  }

  updateBranding(payload: BrandingSettings): Observable<ApiResponse<BrandingSettings>> {
    return this.http.put<ApiResponse<BrandingSettings>>(`${this.API_URL}/branding`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  getPublicApiClients(): Observable<ApiResponse<PublicApiClient[]>> {
    return this.cachedGet<PublicApiClient[]>('public-api-clients', `${this.API_URL}/public-api/clients`);
  }

  createPublicApiClient(payload: {
    name: string;
    description?: string;
    apiKey?: string;
    isActive: boolean;
    canDownloadFiles: boolean;
    rateLimitPerMinute: number;
    maxPageSize: number;
  }): Observable<ApiResponse<{ client: PublicApiClient; apiKey: string }>> {
    return this.http.post<ApiResponse<{ client: PublicApiClient; apiKey: string }>>(`${this.API_URL}/public-api/clients`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  updatePublicApiClient(id: string, payload: {
    name?: string;
    description?: string;
    apiKey?: string;
    isActive?: boolean;
    canDownloadFiles?: boolean;
    rateLimitPerMinute?: number;
    maxPageSize?: number;
  }): Observable<ApiResponse<{ client: PublicApiClient; apiKey?: string }>> {
    return this.http.put<ApiResponse<{ client: PublicApiClient; apiKey?: string }>>(`${this.API_URL}/public-api/clients/${id}`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  deletePublicApiClient(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/public-api/clients/${id}`)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  rotatePublicApiClientKey(id: string): Observable<ApiResponse<{ client: PublicApiClient; apiKey: string }>> {
    return this.http.post<ApiResponse<{ client: PublicApiClient; apiKey: string }>>(`${this.API_URL}/public-api/clients/${id}/rotate-key`, {})
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  testPublicApiClient(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/public-api/clients/${id}/test`, {})
      .pipe(catchError(this.handleError));
  }

  testPublicCertificationsApi(apiKey: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>('/api/certifications/public/external', {
      headers: {
        'x-api-key': apiKey
      },
      params: { page: '1', limit: '3' }
    }).pipe(catchError(this.handleError));
  }

  getReportsOverview(query: Record<string, string>): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params = params.set(key, value);
    }
    return this.cachedGet<any>(`reports-overview:${params.toString()}`, `${this.API_URL}/reports/overview`, params);
  }

  exportReport(filters?: Record<string, string>): Observable<Blob> {
    let params = new HttpParams();
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value);
        }
      }
    }
    return this.http.get(`${this.API_URL}/reports/export`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  // Obtener la configuración actual de seguridad de contraseñas
  getSecuritySettings(): Observable<ApiResponse<SecuritySettingsData>> {
    return this.cachedGet<SecuritySettingsData>('security-settings', `${this.API_URL}/security`);
  }

  // Actualizar la configuración de seguridad de contraseñas
  updateSecuritySettings(payload: SecuritySettingsData): Observable<ApiResponse<SecuritySettingsData>> {
    return this.http.put<ApiResponse<SecuritySettingsData>>(`${this.API_URL}/security`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
  }

  // Probar la configuración de Active Directory (Azure o LDAP) en el backend
  testAdSettings(payload: SecuritySettingsData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/security/test-ad`, payload)
      .pipe(catchError(this.handleError));
  }

  // Obtener lista de backups locales en el disco del servidor
  getLocalBackups(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/backup/local`)
      .pipe(catchError(this.handleError));
  }

  // Generar de forma manual un backup en el servidor local
  createManualLocalBackup(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/backup/local`, {})
      .pipe(catchError(this.handleError));
  }

  // Descargar archivo de backup local específico
  downloadLocalBackup(filename: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/backup/local/download/${filename}`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  // Eliminar archivo de backup local del disco
  deleteLocalBackup(filename: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/backup/local/${filename}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || error.error?.error || 'Error procesando configuracion';
    return throwError(() => new Error(message));
  }

  private cachedGet<T>(key: string, url: string, params?: HttpParams): Observable<ApiResponse<T>> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.response as ApiResponse<T>);
    }

    return this.http.get<ApiResponse<T>>(url, { params }).pipe(
      tap((response) => {
        this.cache.set(key, {
          expiresAt: Date.now() + this.cacheTtlMs,
          response: response as ApiResponse<unknown>
        });
      }),
      catchError(this.handleError)
    );
  }

  private clearCache(): void {
    this.cache.clear();
  }
}
