import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { SettingsService } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-backup-settings',
  standalone: true,
  imports: [CommonModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1"><i class="fas fa-database me-2"></i>Backup</h1>
          <p class="text-muted mb-0">Exporta configuraciones, usuarios, certificaciones y branding.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="row mb-4">
        <div class="col-md-3" *ngFor="let item of summaryItems">
          <div class="card text-center">
            <div class="card-body">
              <i class="fas fa-2x text-primary mb-2" [class]="item.icon"></i>
              <h4>{{ item.value }}</h4>
              <p class="text-muted mb-0">{{ item.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Exportacion completa</h5>
        </div>
        <div class="card-body">
          <p class="text-muted">El archivo JSON incluye datos operacionales y configuraciones. Las contraseñas SMTP no se exponen en texto plano.</p>
          <button class="btn btn-primary" (click)="downloadBackup()" [disabled]="exporting">
            <i class="fas fa-download me-1"></i>
            {{ exporting ? 'Exportando...' : 'Exportar Backup JSON' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class BackupSettingsComponent implements OnInit {
  summary: any = {};
  exporting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private readonly settingsService: SettingsService) {}

  get summaryItems() {
    return [
      { label: 'Usuarios', value: this.summary.users || 0, icon: 'fa-users' },
      { label: 'Certificaciones', value: this.summary.certifications || 0, icon: 'fa-certificate' },
      { label: 'Perfiles SMTP', value: this.summary.smtpProfiles || 0, icon: 'fa-envelope' },
      { label: 'Auditorias', value: this.summary.auditLogs || 0, icon: 'fa-clipboard-list' }
    ];
  }

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.settingsService.getBackupSummary().subscribe({
      next: (response) => this.summary = response.data || {},
      error: (error) => this.errorMessage = error.message
    });
  }

  downloadBackup(): void {
    this.exporting = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.settingsService.exportBackup().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `certivault-backup-${Date.now()}.json`);
        this.successMessage = 'Backup exportado correctamente.';
        this.exporting = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.exporting = false;
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
