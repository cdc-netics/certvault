import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CertificationService } from '../../../core/services/certification.service';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { AuthService } from '../../../core/services/auth.service';
import { Certification, CertificationStatus, CertificationFilter } from '../../../core/models/certification.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-certifications-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, BackButtonComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2">
          Certificaciones 
          <span class="badge bg-primary ms-2" *ngIf="totalCertifications > 0">{{ totalCertifications }}</span>
        </h1>
        <div class="btn-toolbar mb-2 mb-md-0">
          <div class="btn-group me-2">
            <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
          </div>
          <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="clearFilters()">
              <i class="fas fa-filter-circle-xmark me-1"></i>
              Limpiar Filtros
            </button>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-primary" routerLink="/certifications/new">
              <i class="fas fa-plus me-1"></i>
              Nueva Certificacion
            </button>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card mb-4">
        <div class="card-header">
          <h6 class="card-title mb-0">
            <i class="fas fa-filter me-2"></i>
            Filtros de Busqueda
            <button 
              class="btn btn-sm btn-link float-end" 
              type="button" 
              (click)="toggleFilters()"
            >
              <i class="fas" [class.fa-chevron-up]="showFilters" [class.fa-chevron-down]="!showFilters"></i>
            </button>
          </h6>
        </div>
        <div class="card-body" [class.d-none]="!showFilters">
          <form [formGroup]="filterForm">
            <div class="row">
              <div class="col-md-4 mb-3">
                <label for="search" class="form-label">Busqueda General</label>
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    id="search"
                    class="form-control"
                    formControlName="search"
                    placeholder="Buscar certificacion, persona..."
                  >
                </div>
              </div>

              <div class="col-md-4 mb-3">
                <label for="type" class="form-label">Tipo</label>
                <select id="type" class="form-control" formControlName="type">
                  <option value="">Todos los tipos</option>
                  <option value="technical">Tecnica</option>
                  <option value="professional">Profesional</option>
                  <option value="security">Seguridad</option>
                  <option value="cloud">Cloud</option>
                  <option value="management">Gestion</option>
                  <option value="soft_skills">Habilidades Blandas</option>
                  <option value="compliance">Cumplimiento</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div class="col-md-4 mb-3">
                <label for="level" class="form-label">Nivel</label>
                <select id="level" class="form-control" formControlName="level">
                  <option value="">Todos los niveles</option>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                  <option value="expert">Experto</option>
                </select>
              </div>
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <label for="provider" class="form-label">Plataforma/Emisor</label>
                <select id="provider" class="form-control" formControlName="provider">
                  <option value="">Todas las plataformas</option>
                  <option *ngFor="let provider of uniqueProviders" [value]="provider">{{ provider }}</option>
                </select>
              </div>

              <div class="col-md-4 mb-3">
                <label for="department" class="form-label">Departamento</label>
                <select id="department" class="form-control" formControlName="department">
                  <option value="">Todos los departamentos</option>
                  <option *ngFor="let dept of uniqueDepartments" [value]="dept">{{ dept }}</option>
                </select>
              </div>

              <div class="col-md-4 mb-3">
                <label for="status" class="form-label">Estado</label>
                <select id="status" class="form-control" formControlName="status">
                  <option value="">Todos los estados</option>
                  <option value="active">Activa</option>
                  <option value="expired">Expirada</option>
                  <option value="expiring_soon">Por Expirar</option>
                  <option value="pending">Pendiente</option>
                  <option value="revoked">Revocada</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Loading -->
      <div class="text-center py-4" *ngIf="isLoading">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2 text-muted">Cargando certificaciones...</p>
      </div>

      <!-- Error Message -->
      <div class="alert alert-danger" *ngIf="errorMessage">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ errorMessage }}
      </div>

      <!-- Listado -->
      <div *ngIf="!isLoading && certifications.length > 0">
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          <div class="col" *ngFor="let cert of certifications">
            <div class="card certification-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title mb-0">{{ cert.title }}</h5>
                  <span class="badge bg-primary text-uppercase">{{ cert.level }}</span>
                </div>
                <p class="text-muted mb-2">
                  <i class="fas fa-building me-1"></i>{{ cert.provider }}
                </p>
                <p class="text-muted mb-2">
                  <i class="fas fa-user me-1"></i>{{ cert.employeeName }} · {{ cert.department }}
                </p>
                <p class="text-muted mb-2">
                  <i class="fas fa-calendar me-1"></i>{{ cert.issueDate | date:'yyyy-MM-dd' }}
                  <span *ngIf="cert.expirationDate"> · Vence: {{ cert.expirationDate | date:'yyyy-MM-dd' }}</span>
                </p>
                <span class="badge bg-secondary text-uppercase">{{ cert.type }}</span>
                <div class="mt-3 d-flex flex-wrap gap-2 align-items-center">
                  <ng-container *ngIf="cert.certificateUrl">
                    <button class="btn btn-sm btn-outline-secondary" type="button" (click)="downloadCertificate(cert)">
                      <i class="fas fa-download me-1"></i> Descargar
                    </button>
                    <a class="btn btn-sm btn-outline-primary" [href]="getCertificateUrl(cert)" target="_blank" rel="noopener">
                      <i class="fas fa-eye me-1"></i> Ver Certificacion/Badge
                    </a>
                  </ng-container>
                  <button
                    class="btn btn-sm btn-outline-info"
                    type="button"
                    (click)="openCertificationDetails(cert)">
                    <i class="fas fa-circle-info me-1"></i> Detalle
                  </button>
                  <a
                    class="btn btn-sm btn-outline-warning"
                    *ngIf="canEditCertification(cert)"
                    [routerLink]="['/certifications/edit', cert._id]">
                    <i class="fas fa-pen me-1"></i> Editar
                  </a>
                  <button 
                    class="btn btn-sm btn-outline-danger"
                    type="button"
                    *ngIf="canDeleteCertifications()"
                    (click)="deleteCertification(cert)">
                    <i class="fas fa-trash me-1"></i> Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav class="mt-4" aria-label="Paginacion de certificaciones" *ngIf="totalPages > 1">
          <ul class="pagination justify-content-center">
            <li class="page-item" [class.disabled]="currentPage === 1">
              <button class="page-link" (click)="changePage(currentPage - 1)">Anterior</button>
            </li>
            <li class="page-item" *ngFor="let page of [].constructor(totalPages); let idx = index" [class.active]="currentPage === idx + 1">
              <button class="page-link" (click)="changePage(idx + 1)">{{ idx + 1 }}</button>
            </li>
            <li class="page-item" [class.disabled]="currentPage === totalPages">
              <button class="page-link" (click)="changePage(currentPage + 1)">Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Estado vacio -->
      <div class="text-center py-5" *ngIf="!isLoading && certifications.length === 0">
        <div class="mb-4">
          <i class="fas fa-certificate fa-3x text-muted"></i>
        </div>
        <h5 class="text-muted">Aun no hay certificaciones registradas</h5>
        <p class="text-muted">
          Crea una nueva certificacion o ajusta los filtros para ver resultados.
        </p>
        <button 
          type="button" 
          class="btn btn-primary" 
          routerLink="/certifications/new"
        >
          <i class="fas fa-plus me-1"></i>
          Nueva Certificacion
        </button>
      </div>

      <!-- Modal de detalle de certificacion -->
      <div class="modal fade show" tabindex="-1" role="dialog" style="display: block; background: rgba(0,0,0,0.5);" *ngIf="showDetailsModal && selectedCertification">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-certificate me-2"></i>
                {{ selectedCertification?.title }}
              </h5>
              <button type="button" class="btn-close" aria-label="Close" (click)="closeCertificationDetails()"></button>
            </div>
            <div class="modal-body">
              <div class="row mb-3">
                <div class="col-md-6">
                  <p class="mb-1"><strong>Proveedor:</strong> {{ selectedCertification?.provider }}</p>
                  <p class="mb-1"><strong>Tipo:</strong> {{ selectedCertification?.type }}</p>
                  <p class="mb-1"><strong>Nivel:</strong> {{ selectedCertification?.level }}</p>
                  <p class="mb-1"><strong>Departamento:</strong> {{ selectedCertification?.department }}</p>
                  <p class="mb-1"><strong>Colaborador:</strong> {{ selectedCertification?.employeeName }}</p>
                </div>
                <div class="col-md-6">
                  <p class="mb-1"><strong>Emision:</strong> {{ selectedCertification?.issueDate | date:'yyyy-MM-dd' }}</p>
                  <p class="mb-1" *ngIf="selectedCertification?.expirationDate"><strong>Vence:</strong> {{ selectedCertification?.expirationDate | date:'yyyy-MM-dd' }}</p>
                  <p class="mb-1"><strong>Estado:</strong> {{ selectedCertification?.status }}</p>
                  <p class="mb-1" *ngIf="selectedCertification?.certificateNumber"><strong>N° Certificado:</strong> {{ selectedCertification?.certificateNumber }}</p>
                  <p class="mb-1" *ngIf="selectedCertification?.validationUrl"><strong>Validacion:</strong> <a [href]="selectedCertification?.validationUrl" target="_blank" rel="noopener">Abrir link</a></p>
                </div>
              </div>
              <div class="mb-3" *ngIf="selectedCertification?.description">
                <p class="mb-1"><strong>Descripcion:</strong></p>
                <p class="text-muted">{{ selectedCertification?.description }}</p>
              </div>
              <div class="mb-3" *ngIf="selectedCertification?.tags?.length">
                <p class="mb-1"><strong>Tags:</strong></p>
                <div class="d-flex flex-wrap gap-2">
                  <span class="badge bg-secondary" *ngFor="let tag of selectedCertification?.tags">{{ tag }}</span>
                </div>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <a *ngIf="selectedCertification?.certificateUrl" class="btn btn-outline-primary btn-sm" [href]="getCertificateUrl(selectedCertification!)" target="_blank" rel="noopener">
                  <i class="fas fa-eye me-1"></i> Ver Certificado
                </a>
                <button *ngIf="selectedCertification?.certificateUrl" class="btn btn-outline-secondary btn-sm" type="button" (click)="downloadCertificate(selectedCertification!)">
                  <i class="fas fa-download me-1"></i> Descargar
                </button>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeCertificationDetails()">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" *ngIf="showDetailsModal"></div>
    </div>
  `,
  styles: [`
    .certification-card {
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #e9ecef;
    }
    
    .certification-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .table th {
      border-top: none;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
    }
    
    .page-link {
      color: var(--primary-color);
    }
    
    .page-item.active .page-link {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }
  `]
})
export class CertificationsListComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  certifications: Certification[] = [];
  filteredCertifications: Certification[] = [];
  paginatedCertifications: Certification[] = [];
  isLoading = false;
  errorMessage = '';
  showFilters = true;
  viewMode: 'grid' | 'table' = 'grid';
  
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;
  totalCertifications = 0;
  
  uniqueProviders: string[] = [];
  uniqueDepartments: string[] = [];
  
  stats: any = null;
  selectedCertification: Certification | null = null;
  showDetailsModal = false;
  
  private filtersSubscription?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly certificationService: CertificationService,
    private readonly authService: AuthService,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      type: [''],
      level: [''],
      provider: [''],
      department: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit(): void {
    this.subscribeToExternalFilters();
    this.setupFilterSubscription();
    this.handleQueryParams();
  }

  ngOnDestroy(): void {
    if (this.filtersSubscription) {
      this.filtersSubscription.unsubscribe();
    }
  }

  private subscribeToExternalFilters(): void {
    this.filtersSubscription = this.certificationService.filters$.subscribe((filters: CertificationFilter) => {
      if (filters && Object.keys(filters).length > 0) {
        this.applyExternalFilters(filters);
      }
    });
  }

  private applyExternalFilters(filters: CertificationFilter): void {
    this.filterForm.patchValue(filters);
    this.showFilters = true;
  }

  hasActiveFiltersFromDashboard(): boolean {
    const currentFilters = this.certificationService.getCurrentFilters();
    return currentFilters && Object.keys(currentFilters).length > 0;
  }

  getActiveFilterMessage(): string {
    const currentFilters = this.certificationService.getCurrentFilters();
    
    if (currentFilters.status) {
      switch (currentFilters.status) {
        case CertificationStatus.ACTIVE:
          return 'Mostrando certificaciones activas';
        case CertificationStatus.EXPIRED:
          return 'Mostrando certificaciones expiradas';
        case CertificationStatus.EXPIRING_SOON:
          return 'Mostrando certificaciones proximas a expirar';
        default:
          return 'Filtro personalizado aplicado';
      }
    }
    
    return 'Filtro personalizado aplicado';
  }

  clearAllFilters(): void {
    this.certificationService.clearFilters();
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadCertifications();
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadCertifications();
    });
  }

  clearFilters(): void {
    this.clearAllFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  exportToCsv(): void {
    alert('Funcion de exportacion disponible con base de datos conectada');
  }

  private buildFilters(): CertificationFilter {
    const filters = this.filterForm.value as CertificationFilter;
    return Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== '')
    ) as CertificationFilter;
  }

  loadCertifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters = this.buildFilters();

    this.certificationService.getAllCertifications(
      { page: this.currentPage, limit: this.itemsPerPage },
      filters
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.certifications = response.data.data;
          this.totalCertifications = response.data.total;
          this.totalPages = response.data.totalPages;
          this.updateUniqueFilters();
        } else {
          this.certifications = [];
          this.totalCertifications = 0;
          this.totalPages = 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar las certificaciones';
        this.isLoading = false;
      }
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadCertifications();
  }

  downloadCertificate(cert: Certification): void {
    const url = this.getCertificateUrl(cert);
    if (!url) return;

    this.certificationService.downloadFile(url).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = cert.certificateNumber || cert.title || 'certificado';
        link.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => {
        this.errorMessage = 'No se pudo descargar la certificación';
      }
    });
  }

  getCertificateUrl(cert: Certification): string {
    if (!cert.certificateUrl) return '';
    if (cert.certificateUrl.startsWith('http')) return cert.certificateUrl;
    const backendBase = 'http://10.0.100.14:3000';
    return `${backendBase}${cert.certificateUrl.startsWith('/') ? '' : '/'}${cert.certificateUrl}`;
  }

  openCertificationDetails(cert: Certification): void {
    this.selectedCertification = cert;
    this.showDetailsModal = true;
  }

  closeCertificationDetails(): void {
    this.showDetailsModal = false;
    this.selectedCertification = null;
  }

  deleteCertification(cert: Certification): void {
    // console.log('Intentando borrar certificacion:', cert);
    if (!this.canDeleteCertifications()) return;
    console.log('Permiso concedido para borrar certificacion');
    // const confirmed = confirm(`¿Borrar la certificación "${cert.title}"? Esta acción es permanente.`);
    // if (!confirmed || !cert._id) return;
    if (!cert._id) return;
    console.log('Borrando certificacion con ID:', cert._id);

    this.isLoading = true;
    this.certificationService.deleteCertification(cert._id).subscribe({
      next: () => {
        this.loadCertifications();
      },
      error: (error) => {
        this.errorMessage = error.message || 'No se pudo borrar la certificación';
        this.isLoading = false;
      }
    });
  }

  canDeleteCertifications(): boolean {
    return this.authService.isAdmin();
  }

  canEditCertification(cert: Certification): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const isOwner = cert.employeeId === user._id || cert.createdBy === user._id;
    const sameDepartment =
      cert.department === user.department ||
      (user.managedDepartments || []).includes(cert.department as any);
    if (this.authService.isAdmin()) return true;
    if (this.authService.isLeader() && sameDepartment) return true;
    return isOwner;
  }

  private handleQueryParams(): void {
    this.route.queryParamMap.subscribe(params => {
      const statusParam = params.get('status') as CertificationStatus | null;
      if (statusParam) {
        this.filterForm.patchValue({ status: statusParam });
      } else {
        this.filterForm.patchValue({ status: '' });
      }
      this.currentPage = 1;
      this.loadCertifications();
    });
  }

  private updateUniqueFilters(): void {
    const providers = new Set<string>();
    const departments = new Set<string>();

    this.certifications.forEach(cert => {
      if (cert.provider) providers.add(cert.provider);
      if (cert.department) departments.add(cert.department);
    });

    this.uniqueProviders = Array.from(providers);
    this.uniqueDepartments = Array.from(departments);
  }
}


