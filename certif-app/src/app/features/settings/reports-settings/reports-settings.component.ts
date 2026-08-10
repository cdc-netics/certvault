import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';

import { UserService } from '../../../core/services/user.service';

interface ReportFilters {
  department: string;
  status: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-reports-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Barra de Filtros Plana -->
    <div class="row g-2 align-items-center mb-4 p-3 bg-light rounded-3 border border-light-subtle">
      <div class="col-md-3">
        <label class="form-label small fw-semibold text-secondary mb-1">Departamento</label>
        <select class="form-select form-select-sm" [(ngModel)]="filters.department">
          <option value="">Todos los departamentos</option>
          <option *ngFor="let dept of departments" [value]="dept._id">
            {{ dept.name }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label small fw-semibold text-secondary mb-1">Estado</label>
        <select class="form-select form-select-sm" [(ngModel)]="filters.status">
          <option value="">Todos</option>
          <option value="active">Activas</option>
          <option value="expired">Expiradas</option>
          <option value="expiring_soon">Por vencer</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Desde</label>
        <input class="form-control form-control-sm" type="date" [(ngModel)]="filters.from">
      </div>
      <div class="col-md-2">
        <label class="form-label small fw-semibold text-secondary mb-1">Hasta</label>
        <input class="form-control form-control-sm" type="date" [(ngModel)]="filters.to">
      </div>
      <div class="col-md-2 d-flex align-items-end gap-1" style="height: 55px;">
        <button class="btn btn-primary btn-sm flex-fill fw-semibold h-100" style="max-height: 31px;"
                (click)="loadReport()" [disabled]="isLoading || isExporting">
          <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-1" role="status"></span>
          {{ isLoading ? 'Generando...' : 'Generar' }}
        </button>
        <button class="btn btn-outline-success btn-sm fw-semibold h-100" style="max-height: 31px;"
                title="Exportar CSV" (click)="exportCsv()" [disabled]="isLoading || isExporting">
          <i class="fas" [ngClass]="isExporting ? 'fa-spinner fa-spin' : 'fa-download'"></i>
        </button>
      </div>
    </div>

    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

    <!-- Módulo de Métricas Planas -->
    <div class="row g-3 mb-5">
      <div class="col-md-2" *ngFor="let item of totals">
        <div class="p-3 bg-light rounded-3 border border-light-subtle text-center">
          <h4 class="fw-bold text-dark mb-1">{{ item.value }}</h4>
          <span class="text-muted small fw-medium d-block" style="font-size: 0.75rem;">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Distribuciones y Desgloses Planos -->
    <div class="row g-5">
      <div class="col-lg-6" *ngFor="let block of blocks">
        <div>
          <h5 class="fw-bold text-dark mb-3 border-bottom pb-2">
            {{ block.title }}
          </h5>
          <div class="mt-3">
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light-subtle" *ngFor="let item of block.items">
              <span class="text-dark fw-medium">{{ item._id || 'Sin dato' }}</span>
              <span class="badge bg-secondary-subtle text-dark border px-2 py-1">{{ item.count }}</span>
            </div>
            <p class="text-muted small py-3 text-center" *ngIf="block.items.length === 0">Sin datos de distribución.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReportsSettingsComponent implements OnInit {
  report: any = {};
  errorMessage = '';
  isLoading = false;
  isExporting = false;
  filters: ReportFilters = { department: '', status: '', from: '', to: '' };
  departments: any[] = []; // Listado de departamentos activos para el select

  constructor(
    private readonly settingsService: SettingsService,
    private readonly userService: UserService
  ) {}

  get totals() {
    const totals = this.report.totals || {};
    return [
      { label: 'Certificaciones', value: totals.totalCertifications || 0 },
      { label: 'Activas', value: totals.active || 0 },
      { label: 'Expiradas', value: totals.expired || 0 },
      { label: 'Por vencer', value: totals.expiringSoon || 0 },
      { label: 'Usuarios', value: totals.totalUsers || 0 },
      { label: 'Usuarios activos', value: totals.activeUsers || 0 }
    ];
  }

  get blocks() {
    return [
      { title: 'Por departamento', items: this.report.byDepartment || [] },
      { title: 'Por estado', items: this.report.byStatus || [] },
      { title: 'Top proveedores', items: this.report.byProvider || [] },
      { title: 'Top tecnologias', items: this.report.byTechnology || [] }
    ];
  }

  ngOnInit(): void {
    this.loadReport();
    this.loadDepartments();
  }

  loadDepartments(): void {
    // Obtener únicamente los departamentos activos
    this.userService.getDepartmentsList(true).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.departments = response.data.sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: (err) => console.error('Error al cargar departamentos:', err)
    });
  }

  loadReport(): void {
    this.errorMessage = '';
    this.isLoading = true;
    this.settingsService.getReportsOverview({ ...this.filters }).subscribe({
      next: (response) => {
        this.report = response.data || {};
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }

  exportCsv(): void {
    this.errorMessage = '';
    this.isExporting = true;
    this.settingsService.exportReport({ ...this.filters }).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `certificaciones-reporte-${Date.now()}.csv`);
        this.isExporting = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isExporting = false;
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
