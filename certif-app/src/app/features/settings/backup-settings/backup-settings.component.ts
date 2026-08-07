import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService, SecuritySettingsData } from '../../../core/services/settings.service';

@Component({
  selector: 'app-backup-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

    <!-- Panel de Métricas/Resumen Plano -->
    <div class="row g-3 mb-5">
      <div class="col-md-3" *ngFor="let item of summaryItems">
        <div class="p-3 bg-light rounded-3 border border-light-subtle d-flex align-items-center gap-3">
          <div class="p-2 bg-white rounded-2 shadow-sm border border-light-subtle text-primary">
            <i class="fas fa-lg" [class]="item.icon"></i>
          </div>
          <div>
            <h4 class="fw-bold text-dark mb-0">{{ item.value }}</h4>
            <span class="text-muted small fw-medium">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fila 1: Exportar e Importar -->
    <div class="row g-5 mb-5">
      <!-- Exportar -->
      <div class="col-md-6">
        <h5 class="fw-bold text-dark mb-1">
          <i class="fas fa-file-export text-primary me-2"></i>Exportar Datos
        </h5>
        <p class="text-muted small mb-4">Descarga un archivo ZIP con la información del sistema. Puedes elegir entre respaldar solo las configuraciones o generar un respaldo completo que incluye todos los archivos adjuntos.</p>
        
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary fw-semibold btn-sm px-3" (click)="downloadBackup('config')" [disabled]="exportingConfig || exportingFull">
            <i class="fas fa-cogs me-1" *ngIf="!exportingConfig"></i>
            <i class="fas fa-spinner fa-spin me-1" *ngIf="exportingConfig"></i>
            Solo Configuraciones
          </button>
          <button class="btn btn-primary fw-semibold btn-sm px-3" (click)="downloadBackup('full')" [disabled]="exportingConfig || exportingFull">
            <i class="fas fa-archive me-1" *ngIf="!exportingFull"></i>
            <i class="fas fa-spinner fa-spin me-1" *ngIf="exportingFull"></i>
            Respaldo Completo
          </button>
        </div>
      </div>

      <!-- Importar -->
      <div class="col-md-6">
        <h5 class="fw-bold text-dark mb-1">
          <i class="fas fa-file-import text-success me-2"></i>Importar Datos
        </h5>
        <p class="text-muted small mb-4">Restaura el sistema a partir de un archivo ZIP de respaldo previo. Esta acción actualizará las configuraciones y reemplazará los archivos cargados.</p>
        
        <div>
          <div class="input-group">
            <input type="file" class="form-control form-control-sm" accept=".zip" (change)="onFileSelected($event)" [disabled]="importing || wiping">
            <button class="btn btn-success btn-sm fw-semibold px-3" [disabled]="!selectedFile || importing || wiping" (click)="importBackup()">
              <i class="fas fa-upload me-1" *ngIf="!importing"></i>
              <i class="fas fa-spinner fa-spin me-1" *ngIf="importing"></i>
              {{ importing ? 'Importando...' : 'Restaurar ZIP' }}
            </button>
          </div>
          <small class="text-muted mt-2 d-block small">Acepta archivos .zip generados únicamente por esta plataforma.</small>
        </div>
      </div>
    </div>

    <hr class="my-5 text-muted opacity-10">

    <!-- Fila 2: Respaldos Automáticos e Historial Local -->
    <div class="row g-5 mb-5">
      <!-- Configuración de Backup Automático -->
      <div class="col-lg-5">
        <h5 class="fw-bold text-dark mb-1">
          <i class="fas fa-clock text-primary me-2"></i>Respaldos Automáticos
        </h5>
        <p class="text-muted small mb-4">Configura una tarea programada para generar respaldos automáticos completos y rotativos. Se conserva un máximo de 10 archivos.</p>
        
        <div class="mb-4 form-check form-switch p-3 bg-light rounded-3 border border-light-subtle d-flex align-items-center justify-content-between">
          <div class="ps-1">
            <label class="form-check-label fw-bold text-dark mb-0 cursor-pointer" for="autoBackupEnabled">Habilitar Respaldos Automáticos</label>
            <div class="text-muted small" style="font-size: 0.75rem;">Genera un respaldo automático de forma periódica.</div>
          </div>
          <input 
            type="checkbox" 
            id="autoBackupEnabled" 
            class="form-check-input fs-4 me-0" 
            [(ngModel)]="securitySettings.autoBackupEnabled"
            style="cursor: pointer;"
          >
        </div>

        <div class="mb-4" *ngIf="securitySettings.autoBackupEnabled">
          <label for="autoBackupIntervalDays" class="form-label fw-semibold text-secondary small">Intervalo de ejecución</label>
          <select 
            id="autoBackupIntervalDays" 
            class="form-select form-select-sm" 
            [(ngModel)]="securitySettings.autoBackupIntervalDays"
          >
            <option [ngValue]="1">Diario (1 día)</option>
            <option [ngValue]="3">Cada 3 días</option>
            <option [ngValue]="7">Semanal (7 días)</option>
            <option [ngValue]="15">Quincenal (15 días)</option>
            <option [ngValue]="30">Mensual (30 días)</option>
          </select>
        </div>

        <div class="mb-4 text-muted small" *ngIf="securitySettings.lastAutoBackupAt">
          <i class="fas fa-history me-1"></i>Último respaldo automático: <strong>{{ securitySettings.lastAutoBackupAt | date:'dd/MM/yyyy HH:mm:ss' }}</strong>
        </div>

        <button 
          class="btn btn-outline-primary fw-semibold btn-sm px-3" 
          (click)="saveSecuritySettings()" 
          [disabled]="savingSettings"
        >
          <i class="fas fa-save me-1" *ngIf="!savingSettings"></i>
          <i class="fas fa-spinner fa-spin me-1" *ngIf="savingSettings"></i>
          Guardar Configuración
        </button>
      </div>

      <!-- Historial de Respaldos Locales -->
      <div class="col-lg-7">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold text-dark mb-1">
              <i class="fas fa-hdd text-primary me-2"></i>Respaldos Locales en Servidor
            </h5>
            <p class="text-muted small mb-0">Listado de archivos físicos de respaldo almacenados en el servidor.</p>
          </div>
          <button 
            class="btn btn-sm btn-outline-primary fw-semibold" 
            (click)="createLocalBackup()" 
            [disabled]="creatingLocal || loadingLocal"
          >
            <i class="fas fa-plus me-1" *ngIf="!creatingLocal"></i>
            <i class="fas fa-spinner fa-spin me-1" *ngIf="creatingLocal"></i>
            Generar Ahora
          </button>
        </div>

        <div class="mt-4">
          <div class="text-center py-4 text-muted border border-dashed rounded-3 bg-light" *ngIf="loadingLocal">
            <i class="fas fa-spinner fa-spin fa-lg mb-2"></i>
            <p class="mb-0 small">Cargando lista de respaldos...</p>
          </div>

          <div class="text-center py-4 text-muted border border-dashed rounded-3 bg-light" *ngIf="!loadingLocal && localBackups.length === 0">
            <i class="fas fa-folder-open fa-lg mb-2"></i>
            <p class="mb-0 small">No se encontraron respaldos locales en el servidor.</p>
          </div>

          <div class="table-responsive border rounded-3 bg-white" *ngIf="!loadingLocal && localBackups.length > 0">
            <table class="table table-hover align-middle mb-0" style="font-size: 0.9rem;">
              <thead class="table-light text-secondary">
                <tr>
                  <th class="ps-3">Archivo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                  <th class="text-end pe-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let backup of localBackups">
                  <td class="text-break ps-3">
                    <i class="fas fa-file-archive text-warning me-2"></i>
                    <span class="fw-medium text-dark">{{ backup.filename }}</span>
                  </td>
                  <td class="text-dark">{{ formatSize(backup.sizeBytes) }}</td>
                  <td class="text-secondary">{{ backup.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <button 
                        class="btn btn-outline-secondary" 
                        title="Descargar archivo"
                        (click)="downloadLocalBackup(backup.filename)"
                      >
                        <i class="fas fa-download"></i>
                      </button>
                      <button 
                        class="btn btn-outline-danger" 
                        title="Eliminar del servidor"
                        (click)="deleteLocalBackup(backup.filename)"
                      >
                        <i class="fas fa-trash"></i>
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

    <!-- Zona de Peligro SaaS Plana -->
    <div class="mt-5 border-start border-4 border-danger ps-4 py-3 bg-danger-subtle bg-opacity-10 rounded-end-3">
      <h5 class="fw-bold text-danger mb-1">
        <i class="fas fa-exclamation-triangle me-2"></i>Zona de Peligro: Restablecer Sistema
      </h5>
      <p class="text-muted small mb-3">
        Esto eliminará permanentemente todas las certificaciones, colaboradores, registros de auditoría y configuraciones del servidor SMTP. Solo se conservará la cuenta del administrador por defecto. **Esta acción es irreversible.**
      </p>
      <button class="btn btn-danger btn-sm fw-semibold px-4" [disabled]="wiping || importing" (click)="systemWipe()">
        <i class="fas fa-trash-alt me-1" *ngIf="!wiping"></i>
        <i class="fas fa-spinner fa-spin me-1" *ngIf="wiping"></i>
        {{ wiping ? 'Borrando...' : 'Restablecer Todo el Sistema' }}
      </button>
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
