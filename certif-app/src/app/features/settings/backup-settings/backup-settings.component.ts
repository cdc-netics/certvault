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
          <p class="text-muted mb-0">Exporta e importa configuraciones, usuarios, certificaciones y archivos (ZIP).</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="row mb-4">
        <div class="col-md-3" *ngFor="let item of summaryItems">
          <div class="card text-center shadow-sm">
            <div class="card-body">
              <i class="fas fa-2x text-primary mb-2" [class]="item.icon"></i>
              <h4>{{ item.value }}</h4>
              <p class="text-muted mb-0">{{ item.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <!-- Exportar -->
        <div class="col-md-6 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h5 class="mb-0"><i class="fas fa-file-export me-2 text-primary"></i>Exportar Datos</h5>
            </div>
            <div class="card-body d-flex flex-column">
              <p class="text-muted">Descarga un archivo ZIP con la información del sistema. Puedes elegir entre respaldar solo las configuraciones o generar un respaldo completo que incluye todos los archivos adjuntos.</p>
              
              <div class="mt-auto d-flex gap-2">
                <button class="btn btn-outline-primary flex-fill" (click)="downloadBackup('config')" [disabled]="exportingConfig || exportingFull">
                  <i class="fas fa-cogs me-1" *ngIf="!exportingConfig"></i>
                  <i class="fas fa-spinner fa-spin me-1" *ngIf="exportingConfig"></i>
                  Solo Configuraciones
                </button>
                <button class="btn btn-primary flex-fill" (click)="downloadBackup('full')" [disabled]="exportingConfig || exportingFull">
                  <i class="fas fa-archive me-1" *ngIf="!exportingFull"></i>
                  <i class="fas fa-spinner fa-spin me-1" *ngIf="exportingFull"></i>
                  Respaldo Completo
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Importar -->
        <div class="col-md-6 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h5 class="mb-0"><i class="fas fa-file-import me-2 text-success"></i>Importar Datos</h5>
            </div>
            <div class="card-body d-flex flex-column">
              <p class="text-muted">Restaura el sistema a partir de un archivo ZIP de respaldo previo. Esta acción actualizará los datos existentes y reemplazará los archivos.</p>
              
              <div class="mt-auto">
                <div class="input-group">
                  <input type="file" class="form-control" accept=".zip" (change)="onFileSelected($event)" [disabled]="importing || wiping">
                  <button class="btn btn-success" [disabled]="!selectedFile || importing || wiping" (click)="importBackup()">
                    <i class="fas fa-upload me-1" *ngIf="!importing"></i>
                    <i class="fas fa-spinner fa-spin me-1" *ngIf="importing"></i>
                    {{ importing ? 'Importando...' : 'Restaurar ZIP' }}
                  </button>
                </div>
                <small class="text-muted mt-2 d-block">Acepta archivos .zip generados por este sistema.</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <!-- Wipe System -->
        <div class="col-12 mb-4">
          <div class="card shadow-sm border-danger">
            <div class="card-header bg-white border-danger">
              <h5 class="mb-0 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Borrar Sistema (Factory Reset)</h5>
            </div>
            <div class="card-body">
              <p class="text-muted">¡Peligro! Esto eliminará todos los usuarios, certificaciones, configuraciones, perfiles SMTP y logs de auditoría. Solo se conservará el administrador configurado en el sistema.</p>
              
              <div class="mt-2">
                <button class="btn btn-danger" [disabled]="wiping || importing" (click)="systemWipe()">
                  <i class="fas fa-trash-alt me-1" *ngIf="!wiping"></i>
                  <i class="fas fa-spinner fa-spin me-1" *ngIf="wiping"></i>
                  {{ wiping ? 'Borrando...' : 'Borrar Todo el Sistema' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BackupSettingsComponent implements OnInit {
  summary: any = {};
  exportingConfig = false;
  exportingFull = false;
  importing = false;
  wiping = false;
  successMessage = '';
  errorMessage = '';
  selectedFile: File | null = null;

  constructor(private readonly settingsService: SettingsService) {}

  get summaryItems() {
    return [
      { label: 'Usuarios', value: this.summary.users || 0, icon: 'fa-users' },
      { label: 'Certificaciones', value: this.summary.certifications || 0, icon: 'fa-certificate' },
      { label: 'Perfiles SMTP', value: this.summary.smtpProfiles || 0, icon: 'fa-envelope' },
      { label: 'Auditorías', value: this.summary.auditLogs || 0, icon: 'fa-clipboard-list' }
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

  // Descarga el respaldo según el tipo solicitado
  downloadBackup(type: 'config' | 'full'): void {
    if (type === 'config') this.exportingConfig = true;
    else this.exportingFull = true;

    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.exportBackup(type).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `certivault-backup-${type}-${Date.now()}.zip`);
        this.successMessage = `Backup (${type}) exportado correctamente.`;
        this.exportingConfig = false;
        this.exportingFull = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al exportar';
        this.exportingConfig = false;
        this.exportingFull = false;
      }
    });
  }

  // Maneja la selección del archivo ZIP
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
      this.errorMessage = 'Por favor, selecciona un archivo ZIP válido.';
    }
  }

  // Sube el archivo para su importación/restauración
  importBackup(): void {
    if (!this.selectedFile) return;

    this.importing = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.importBackup(this.selectedFile).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Respaldo importado correctamente.';
        this.importing = false;
        this.selectedFile = null;
        // Limpiar el input file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        this.loadSummary(); // Recargar el resumen
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al importar respaldo.';
        this.importing = false;
      }
    });
  }

  // Ejecuta el borrado total del sistema
  systemWipe(): void {
    if (confirm('¿ESTÁ SEGURO DE QUE DESEA BORRAR TODO EL SISTEMA?\nEsta acción es irreversible y eliminará todos los datos a excepción del administrador por defecto.')) {
      this.wiping = true;
      this.successMessage = '';
      this.errorMessage = '';

      this.settingsService.systemWipe().subscribe({
        next: (res) => {
          this.successMessage = res.message || 'Sistema borrado correctamente.';
          this.wiping = false;
          this.loadSummary();
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al borrar el sistema.';
          this.wiping = false;
        }
      });
    }
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
