import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { SettingsService, SecuritySettingsData } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-backup-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, SettingsNavComponent],
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
        <!-- Configuracion de Backup Automatico -->
        <div class="col-md-5 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white">
              <h5 class="mb-0"><i class="fas fa-clock me-2 text-primary"></i>Respaldos Automáticos</h5>
            </div>
            <div class="card-body">
              <p class="text-muted small">Configura una rutina del servidor para generar respaldos automáticos completos y rotativos. Se conserva un máximo de 10 archivos.</p>
              
              <div class="mb-3 form-check form-switch">
                <input 
                  type="checkbox" 
                  id="autoBackupEnabled" 
                  class="form-check-input" 
                  [(ngModel)]="securitySettings.autoBackupEnabled"
                >
                <label class="form-check-label fw-bold" for="autoBackupEnabled">Habilitar Respaldos Automáticos</label>
              </div>

              <div class="mb-3" *ngIf="securitySettings.autoBackupEnabled">
                <label for="autoBackupIntervalDays" class="form-label fw-bold">Intervalo de ejecución (días)</label>
                <select 
                  id="autoBackupIntervalDays" 
                  class="form-select" 
                  [(ngModel)]="securitySettings.autoBackupIntervalDays"
                >
                  <option [ngValue]="1">Diario (1 día)</option>
                  <option [ngValue]="3">Cada 3 días</option>
                  <option [ngValue]="7">Semanal (7 días)</option>
                  <option [ngValue]="15">Quincenal (15 días)</option>
                  <option [ngValue]="30">Mensual (30 días)</option>
                </select>
              </div>

              <div class="mb-3 text-muted small" *ngIf="securitySettings.lastAutoBackupAt">
                <i class="fas fa-history me-1"></i>Último respaldo automático: <strong>{{ securitySettings.lastAutoBackupAt | date:'dd/MM/yyyy HH:mm:ss' }}</strong>
              </div>

              <div class="d-grid mt-4">
                <button 
                  class="btn btn-primary" 
                  (click)="saveSecuritySettings()" 
                  [disabled]="savingSettings"
                >
                  <i class="fas fa-save me-1" *ngIf="!savingSettings"></i>
                  <i class="fas fa-spinner fa-spin me-1" *ngIf="savingSettings"></i>
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Historial de Respaldos Locales -->
        <div class="col-md-7 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-hdd me-2 text-primary"></i>Respaldos Locales en Servidor</h5>
              <button 
                class="btn btn-sm btn-outline-primary" 
                (click)="createLocalBackup()" 
                [disabled]="creatingLocal || loadingLocal"
              >
                <i class="fas fa-plus me-1" *ngIf="!creatingLocal"></i>
                <i class="fas fa-spinner fa-spin me-1" *ngIf="creatingLocal"></i>
                Generar Ahora
              </button>
            </div>
            <div class="card-body">
              <div class="text-center py-4 text-muted" *ngIf="loadingLocal">
                <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                <p class="mb-0">Cargando lista de respaldos...</p>
              </div>

              <div class="text-center py-4 text-muted" *ngIf="!loadingLocal && localBackups.length === 0">
                <i class="fas fa-folder-open fa-2x mb-2"></i>
                <p class="mb-0">No se encontraron respaldos locales en el servidor.</p>
              </div>

              <div class="table-responsive" *ngIf="!loadingLocal && localBackups.length > 0">
                <table class="table table-hover align-middle small mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Archivo</th>
                      <th>Tamaño</th>
                      <th>Fecha</th>
                      <th class="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let backup of localBackups">
                      <td class="text-break">
                        <i class="fas fa-file-archive text-warning me-1"></i>
                        {{ backup.filename }}
                      </td>
                      <td>{{ formatSize(backup.sizeBytes) }}</td>
                      <td>{{ backup.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="text-end">
                        <div class="btn-group">
                          <button 
                            class="btn btn-sm btn-light" 
                            title="Descargar archivo"
                            (click)="downloadLocalBackup(backup.filename)"
                          >
                            <i class="fas fa-download text-primary"></i>
                          </button>
                          <button 
                            class="btn btn-sm btn-light" 
                            title="Eliminar del servidor"
                            (click)="deleteLocalBackup(backup.filename)"
                          >
                            <i class="fas fa-trash text-danger"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
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

  // Variables para auto-backup e historial local
  localBackups: any[] = [];
  loadingLocal = false;
  creatingLocal = false;
  savingSettings = false;
  securitySettings: SecuritySettingsData = {
    passwordExpirationEnabled: false,
    passwordExpirationMonths: 3,
    certificateExpirationAlertsEnabled: true,
    adLoginEnabled: false,
    adProvider: 'azure',
    autoBackupEnabled: false,
    autoBackupIntervalDays: 7
  };

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
    this.loadSecuritySettings();
    this.loadLocalBackups();
  }

  // Carga las configuraciones de seguridad actuales desde el backend
  loadSecuritySettings(): void {
    this.settingsService.getSecuritySettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.securitySettings = response.data;
        }
      },
      error: (error) => this.errorMessage = 'Error al cargar configuraciones: ' + error.message
    });
  }

  // Guarda las configuraciones de auto-backup modificadas por el usuario
  saveSecuritySettings(): void {
    this.savingSettings = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.updateSecuritySettings(this.securitySettings).subscribe({
      next: (response) => {
        this.successMessage = 'Configuración de respaldos automáticos guardada correctamente.';
        if (response.data) {
          this.securitySettings = response.data;
        }
        this.savingSettings = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al guardar configuración: ' + error.message;
        this.savingSettings = false;
      }
    });
  }

  // Carga el listado de respaldos físicos disponibles en el servidor
  loadLocalBackups(): void {
    this.loadingLocal = true;
    this.settingsService.getLocalBackups().subscribe({
      next: (response) => {
        this.localBackups = response.data || [];
        this.loadingLocal = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar respaldos locales: ' + error.message;
        this.loadingLocal = false;
      }
    });
  }

  // Genera un respaldo local completo manualmente
  createLocalBackup(): void {
    this.creatingLocal = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.createManualLocalBackup().subscribe({
      next: (response) => {
        this.successMessage = 'Respaldo local generado con éxito en el servidor.';
        this.creatingLocal = false;
        this.loadLocalBackups();
      },
      error: (error) => {
        this.errorMessage = 'Error al generar respaldo local: ' + error.message;
        this.creatingLocal = false;
      }
    });
  }

  // Descarga un archivo de respaldo específico desde el servidor al cliente
  downloadLocalBackup(filename: string): void {
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.downloadLocalBackup(filename).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, filename);
        this.successMessage = `Respaldo descargado correctamente: ${filename}`;
      },
      error: (error) => {
        this.errorMessage = 'Error al descargar respaldo local: ' + error.message;
      }
    });
  }

  // Elimina físicamente un archivo de respaldo local
  deleteLocalBackup(filename: string): void {
    if (confirm(`¿Está seguro de que desea eliminar permanentemente del servidor el respaldo "${filename}"?`)) {
      this.successMessage = '';
      this.errorMessage = '';

      this.settingsService.deleteLocalBackup(filename).subscribe({
        next: (response) => {
          this.successMessage = response.message || `Respaldo local eliminado correctamente.`;
          this.loadLocalBackups();
        },
        error: (error) => {
          this.errorMessage = 'Error al eliminar respaldo local: ' + error.message;
        }
      });
    }
  }

  // Formatea tamaño en bytes a KB/MB/GB legibles
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
