import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { 
  Certification, 
  CertificationFilter, 
  CertificationStats 
} from '../models/certification.model';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../models/common.model';
import { extractHttpErrorMessage, handleBlobError } from '../utils/http-error.util';

@Injectable({
  providedIn: 'root'
})
export class CertificationService {
  // Relative path so requests go through the same origin/nginx proxy
  private readonly API_URL = '/api/certifications';

  // BehaviorSubject para compartir filtros entre componentes
  private readonly filtersSubject = new BehaviorSubject<CertificationFilter>({});
  public filters$ = this.filtersSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  // Método para establecer filtros desde otros componentes
  setFilters(filters: CertificationFilter): void {
    this.filtersSubject.next(filters);
  }

  // Método para limpiar filtros
  clearFilters(): void {
    this.filtersSubject.next({});
  }

  // Método para obtener los filtros actuales
  getCurrentFilters(): CertificationFilter {
    return this.filtersSubject.value;
  }

  getAllCertifications(
    pagination: PaginationParams, 
    filter?: CertificationFilter
  ): Observable<ApiResponse<PaginatedResponse<Certification>>> {
    let params = new HttpParams()
      .set('page', pagination.page.toString())
      .set('limit', pagination.limit.toString());

    if (pagination.sortBy) {
      params = params.set('sortBy', pagination.sortBy);
    }
    if (pagination.sortOrder) {
      params = params.set('sortOrder', pagination.sortOrder);
    }

    // Agregar filtros
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params = params.set(key, value.toISOString());
          } else {
            params = params.set(key, value.toString());
          }
        }
      }
    }

    return this.http.get<ApiResponse<any>>(
      this.API_URL, 
      { params }
    ).pipe(
      map((response) => {
        // Adaptar la respuesta del backend a PaginatedResponse
        if (response.success && response.data) {
          const backendData = response.data as any;
          const pagination = backendData.pagination || {};
          return {
            ...response,
            data: {
              data: backendData.certifications || backendData.data || [],
              total: pagination.totalItems ?? pagination.total ?? (backendData.certifications?.length || 0),
              page: pagination.currentPage ?? pagination.page ?? pagination.pageNumber ?? pagination.pageIndex ?? pagination.page ?? 1,
              limit: pagination.limit ?? pagination.pageSize ?? pagination.perPage ?? pagination.limit ?? 10,
              totalPages: pagination.totalPages ?? Math.max(1, Math.ceil((pagination.totalItems ?? 0) / (pagination.limit ?? pagination.pageSize ?? 10)))
            } as PaginatedResponse<Certification>
          };
        }
        return response as ApiResponse<PaginatedResponse<Certification>>;
      }),
      catchError(this.handleError)
    );
  }

  getCertificationById(id: string): Observable<ApiResponse<Certification>> {
    return this.http.get<ApiResponse<Certification>>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createCertification(certification: Partial<Certification>): Observable<ApiResponse<Certification>> {
    return this.http.post<ApiResponse<Certification>>(this.API_URL, certification)
      .pipe(catchError(this.handleError));
  }

  updateCertification(id: string, certification: Partial<Certification>): Observable<ApiResponse<Certification>> {
    return this.http.put<ApiResponse<Certification>>(`${this.API_URL}/${id}`, certification)
      .pipe(catchError(this.handleError));
  }

  deleteCertification(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getCertificationStats(): Observable<ApiResponse<CertificationStats>> {
    return this.http.get<ApiResponse<CertificationStats>>(`${this.API_URL}/stats`)
      .pipe(catchError(this.handleError));
  }

  getExpiringCertifications(days: number = 30): Observable<ApiResponse<Certification[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<Certification[]>>(`${this.API_URL}/expiring`, { params })
      .pipe(catchError(this.handleError));
  }

  getUserCertifications(userId: string): Observable<ApiResponse<Certification[]>> {
    return this.http.get<ApiResponse<Certification[]>>(`${this.API_URL}/user/${userId}`)
      .pipe(catchError(this.handleError));
  }

  downloadAllUserCertifications(userId: string): Observable<Blob> {
    // Solicitar el archivo ZIP consolidado al backend
    return this.http.get(`${this.API_URL}/user/${userId}/download-all`, {
      responseType: 'blob'
    }).pipe(catchError(handleBlobError));
  }

  uploadCertificateFile(certificationId: string, file: File): Observable<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('certificate', file);
    
    return this.http.post<ApiResponse<{ url: string }>>(
      `${this.API_URL}/${certificationId}/upload`, 
      formData
    ).pipe(catchError(this.handleError));
  }

  exportCertifications(format: 'csv' | 'excel' | 'pdf', filter?: CertificationFilter): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params = params.set(key, value.toISOString());
          } else {
            params = params.set(key, value.toString());
          }
        }
      }
    }

    return this.http.get(`${this.API_URL}/export`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(handleBlobError));
  }

  searchCertifications(searchTerm: string): Observable<ApiResponse<Certification[]>> {
    const params = new HttpParams().set('q', searchTerm);
    return this.http.get<ApiResponse<Certification[]>>(`${this.API_URL}/search`, { params })
      .pipe(catchError(this.handleError));
  }

  getTechnologies(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/technologies`)
      .pipe(catchError(this.handleError));
  }

  getDepartments(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/departments`)
      .pipe(catchError(this.handleError));
  }

  getProviders(): Observable<ApiResponse<string[]>> {
    // Consume el endpoint para obtener el listado único de emisores/plataformas
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/providers`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(extractHttpErrorMessage(error)));
  }

  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' }).pipe(catchError(handleBlobError));
  }

  getCertificationFile(id: string, download = false): Observable<Blob> {
    const params = download ? new HttpParams().set('download', '1') : undefined;
    return this.http.get(`${this.API_URL}/${id}/file`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(handleBlobError));
  }
}
