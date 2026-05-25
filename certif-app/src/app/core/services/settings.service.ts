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

  exportBackup(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/backup/export`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  exportFullBackup(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/backup/export/full`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  getBranding(): Observable<ApiResponse<BrandingSettings>> {
    return this.cachedGet<BrandingSettings>('branding', `${this.API_URL}/branding`);
  }

  updateBranding(payload: BrandingSettings): Observable<ApiResponse<BrandingSettings>> {
    return this.http.put<ApiResponse<BrandingSettings>>(`${this.API_URL}/branding`, payload)
      .pipe(tap(() => this.clearCache()), catchError(this.handleError));
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

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || error.error?.error || 'Error procesando configuracion SMTP';
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
