import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { AuditLogsQuery, SettingsService } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-audit-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1"><i class="fas fa-clipboard-list me-2"></i>Log Audit</h1>
          <p class="text-muted mb-0">Eventos relevantes para auditoria de ciberseguridad y cambios sensibles.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="card mb-3">
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-3">
              <input class="form-control" placeholder="Email usuario" [(ngModel)]="query.userEmail">
            </div>
            <div class="col-md-2">
              <select class="form-select" [(ngModel)]="query.action">
                <option value="">Accion</option>
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
              <select class="form-select" [(ngModel)]="query.resource">
                <option value="">Recurso</option>
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
              <input class="form-control" type="date" [(ngModel)]="query.from">
            </div>
            <div class="col-md-2">
              <input class="form-control" type="date" [(ngModel)]="query.to">
            </div>
            <div class="col-md-1">
              <button class="btn btn-primary w-100" (click)="loadLogs()">Filtrar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Fecha</th>
                <th>Accion</th>
                <th>Recurso</th>
                <th>Usuario</th>
                <th>Detalle / Evento</th>
                <th>Estado</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td>{{ log.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
                <td>
                  <!-- Badge con color contextual según la acción de auditoría -->
                  <span class="badge" [ngClass]="{
                    'bg-danger': ['access_denied', 'login_failed', 'download_failed', 'view_failed', 'error'].includes(log.action),
                    'bg-success': ['login_success'].includes(log.action),
                    'bg-warning text-dark': ['update', 'delete'].includes(log.action),
                    'bg-info text-dark': ['create', 'test', 'export', 'download', 'view'].includes(log.action),
                    'bg-secondary': !['access_denied', 'login_failed', 'login_success', 'update', 'delete', 'create', 'test', 'export', 'download', 'view', 'download_failed', 'view_failed', 'error'].includes(log.action)
                  }">{{ log.action }}</span>
                </td>
                <td>{{ log.resource }}</td>
                <td>{{ log.userEmail || 'Sistema' }}</td>
                <td>
                  <div>
                    <!-- Visualización de ruta técnica superior -->
                    <span class="d-block font-monospace text-secondary mb-1" style="font-size: 0.8rem;">
                      {{ log.method }} {{ log.path }}
                    </span>
                    <!-- Mensaje amigable del evento de auditoría -->
                    <span class="fw-semibold">{{ log.message }}</span>
                    
                    <!-- Desglose de metadatos clave (correo de destino, certificaciones, fallas) -->
                    <div *ngIf="log.metadata" class="mt-1 small border-start border-3 ps-2 py-1 text-muted bg-light rounded" style="font-size: 0.75rem; max-width: 400px; word-break: break-all;">
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
                <td>{{ log.ip }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="p-4 text-center text-muted" *ngIf="!loading && logs.length === 0">Sin registros para los filtros seleccionados.</div>
        <div class="p-3 d-flex justify-content-between align-items-center">
          <span class="text-muted">Total: {{ totalItems }}</span>
          <button class="btn btn-outline-secondary btn-sm" (click)="nextPage()" [disabled]="query.page! >= totalPages">Siguiente</button>
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
