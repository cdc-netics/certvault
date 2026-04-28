import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { SettingsService } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

interface ReportFilters {
  department: string;
  status: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-reports-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1"><i class="fas fa-chart-bar me-2"></i>Reportes</h1>
          <p class="text-muted mb-0">Informes de certificaciones, usuarios, vencimientos y proveedores.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Departamento</label>
              <input class="form-control" [(ngModel)]="filters.department">
            </div>
            <div class="col-md-3">
              <label class="form-label">Estado</label>
              <select class="form-select" [(ngModel)]="filters.status">
                <option value="">Todos</option>
                <option value="active">Activas</option>
                <option value="expired">Expiradas</option>
                <option value="expiring_soon">Por vencer</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Desde</label>
              <input class="form-control" type="date" [(ngModel)]="filters.from">
            </div>
            <div class="col-md-2">
              <label class="form-label">Hasta</label>
              <input class="form-control" type="date" [(ngModel)]="filters.to">
            </div>
            <div class="col-md-2 d-flex gap-2">
              <button class="btn btn-primary w-100" (click)="loadReport()">Generar</button>
              <button class="btn btn-outline-success" (click)="exportCsv()">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="row mb-4">
        <div class="col-md-2" *ngFor="let item of totals">
          <div class="card text-center">
            <div class="card-body">
              <h4>{{ item.value }}</h4>
              <small class="text-muted">{{ item.label }}</small>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6" *ngFor="let block of blocks">
          <div class="card h-100">
            <div class="card-header"><h5 class="mb-0">{{ block.title }}</h5></div>
            <div class="card-body">
              <div class="d-flex justify-content-between border-bottom py-2" *ngFor="let item of block.items">
                <span>{{ item._id || 'Sin dato' }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <p class="text-muted mb-0" *ngIf="block.items.length === 0">Sin datos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReportsSettingsComponent implements OnInit {
  report: any = {};
  errorMessage = '';
  filters: ReportFilters = { department: '', status: '', from: '', to: '' };

  constructor(private readonly settingsService: SettingsService) {}

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
  }

  loadReport(): void {
    this.errorMessage = '';
    this.settingsService.getReportsOverview({ ...this.filters }).subscribe({
      next: (response) => this.report = response.data || {},
      error: (error) => this.errorMessage = error.message
    });
  }

  exportCsv(): void {
    this.settingsService.exportReport().subscribe({
      next: (blob) => this.downloadBlob(blob, `certificaciones-reporte-${Date.now()}.csv`),
      error: (error) => this.errorMessage = error.message
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
