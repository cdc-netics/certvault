import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogsQuery, SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-audit-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Barra de Herramientas y Filtros Plana -->
    <div class="row g-2 align-items-center mb-4 p-3 bg-light rounded-3 border border-light-subtle">
      <div class="col-md-3">
        <label class="form-label small fw-semibold text-secondary mb-1">Email de Usuario</label>
        <input class="form-control form-control-sm" placeholder="usuario@empresa.com" [(ngModel)]="query.userEmail">
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Acción</label>
        <select class="form-select form-select-sm" [(ngModel)]="query.action">
          <option value="">Todas las acciones</option>
          <option value="access_denied">Acceso denegado</option>
          <option value="login_success">Login OK</option>
          <option value="login_failed">Login fallido</option>
          <option value="logout">Logout</option>
          <option value="create">Crear</option>
          <option value="update">Actualizar</option>
          <option value="delete">Eliminar</option>
          <option value="export">Exportar</option>
          <option value="test">Test</option>
          <option value="view">Visualizar</option>
          <option value="view_failed">Visualización fallida</option>
          <option value="download">Descargar</option>
          <option value="download_failed">Descarga fallida</option>
          <option value="error">Error de sistema</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Recurso</label>
        <select class="form-select form-select-sm" [(ngModel)]="query.resource">
          <option value="">Todos los recursos</option>
          <option value="auth">Auth</option>
          <option value="users">Usuarios</option>
          <option value="certifications">Certificaciones</option>
          <option value="settings">Configuraciones</option>
          <option value="smtp">SMTP</option>
          <option value="branding">Branding</option>
          <option value="backup">Backup</option>
          <option value="reports">Reportes</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Desde</label>
        <input class="form-control form-control-sm" type="date" [(ngModel)]="query.from">
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Hasta</label>
        <input class="form-control form-control-sm" type="date" [(ngModel)]="query.to">
      </div>
      <div class="col-md-1 d-flex align-items-end">
        <button class="btn btn-primary btn-sm w-100 fw-semibold" style="height: 31px;" (click)="loadLogs()">
          <i class="fas fa-filter me-1"></i>Filtrar
        </button>
      </div>
    </div>

    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

    <!-- Contenedor de Tabla Plano -->
    <div>
      <div class="table-responsive border rounded-3 bg-white">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light text-secondary">
            <tr>
              <th class="ps-3">Fecha</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Usuario</th>
              <th>Detalle / Evento</th>
              <th>Estado</th>
              <th class="pe-3">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs">
              <td class="ps-3 text-dark fw-medium">{{ log.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
              <td>
                <!-- Badge contextual de auditoría refinado -->
                <span class="badge" [ngClass]="{
                  'bg-danger-subtle text-danger border border-danger-subtle': ['access_denied', 'login_failed', 'download_failed', 'view_failed', 'error'].includes(log.action),
                  'bg-success-subtle text-success border border-success-subtle': ['login_success'].includes(log.action),
                  'bg-warning-subtle text-warning-emphasis border border-warning-subtle': ['update', 'delete'].includes(log.action),
                  'bg-info-subtle text-info-emphasis border border-info-subtle': ['create', 'test', 'export', 'download', 'view'].includes(log.action),
                  'bg-secondary-subtle text-secondary border border-secondary-subtle': !['access_denied', 'login_failed', 'login_success', 'update', 'delete', 'create', 'test', 'export', 'download', 'view', 'download_failed', 'view_failed', 'error'].includes(log.action)
                }">{{ log.action }}</span>
              </td>
              <td><span class="text-dark fw-medium">{{ log.resource }}</span></td>
              <td><span class="text-secondary">{{ log.userEmail || 'Sistema' }}</span></td>
              <td>
                <div>
                  <!-- Visualización de ruta técnica superior -->
                  <span class="d-block font-monospace text-secondary mb-1" style="font-size: 0.8rem;">
                    {{ log.method }} {{ log.path }}
                  </span>
                  <!-- Mensaje del evento de auditoría -->
                  <span class="fw-semibold text-dark">{{ log.message }}</span>
                  
                  <!-- Desglose de metadatos clave -->
                  <div *ngIf="log.metadata" class="mt-1 small border-start border-3 border-primary-subtle ps-2 py-1 text-muted bg-light rounded" style="font-size: 0.75rem; max-width: 400px; word-break: break-all;">
                    <div *ngIf="log.metadata['recipient']">
                      <strong class="text-primary">Destinatario:</strong> {{ log.metadata['recipient'] }}
                    </div>
                    <div *ngIf="log.metadata['certificationsCount']">
                      <strong>Certificaciones:</strong> {{ log.metadata['certificationsCount'] }} respaldadas
                    </div>
                    <div *ngIf="log.metadata['error']" class="text-danger mt-1">
                      <strong>Fallo:</strong> {{ log.metadata['error'] }}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <!-- Badge sutil de estado HTTP -->
                <span class="badge" [ngClass]="log.statusCode < 400 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'">
                  {{ log.statusCode }}
                </span>
              </td>
              <td class="pe-3 text-secondary font-monospace" style="font-size: 0.85rem;">{{ log.ip }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 text-center text-muted border border-dashed rounded-3 bg-light mt-3" *ngIf="!loading && logs.length === 0">
        Sin registros para los filtros seleccionados.
      </div>

      <!-- Barra de paginación plana -->
      <div class="mt-3 d-flex justify-content-between align-items-center px-1">
        <span class="text-muted small">Total de registros: <strong>{{ totalItems }}</strong></span>
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted small">Pág. {{ query.page }} de {{ totalPages }}</span>
          <button class="btn btn-outline-secondary btn-sm fw-semibold" (click)="nextPage()" [disabled]="query.page! >= totalPages || loading">
            Siguiente <i class="fas fa-chevron-right ms-1"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class AuditSettingsComponent implements OnInit {
  logs: any[] = [];
  loading = false;
  errorMessage = '';
  totalItems = 0;
  totalPages = 1;
  query: AuditLogsQuery = { page: 1, limit: 25, action: '', resource: '', userEmail: '', from: '', to: '' };

  constructor(private readonly settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.errorMessage = '';
    this.settingsService.getAuditLogs(this.query).subscribe({
      next: (response) => {
        this.logs = response.data?.logs || [];
        this.totalItems = response.data?.pagination?.totalItems || 0;
        this.totalPages = response.data?.pagination?.totalPages || 1;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    this.query.page = (this.query.page || 1) + 1;
    this.loadLogs();
  }
}
