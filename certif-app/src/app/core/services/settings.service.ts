import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
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

  constructor(private readonly http: HttpClient) {}

  getSmtpProfiles(): Observable<ApiResponse<SmtpProfile[]>> {
    return this.cachedGet<SmtpProfile[]>('smtp-profiles', `${this.API_URL}/smtp-profiles`);
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

  exportReport(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/reports/export`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
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
