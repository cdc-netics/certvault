import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicApiClient, SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-external-api-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>
    <div class="alert alert-warning border-0 shadow-sm" *ngIf="generatedApiKey">
      <i class="fas fa-key me-2"></i>
      <strong>API key generada:</strong> <code class="bg-white p-1 rounded">{{ generatedApiKey }}</code>
      <div class="mt-1 small text-muted">Cópiala ahora. Por motivos de seguridad, no se volverá a mostrar completa.</div>
    </div>

    <div class="row g-5" [formGroup]="form">
      <!-- Columna izquierda: Formulario de Cliente API -->
      <div class="col-lg-5">
        <div class="mb-4">
          <h5 class="fw-bold text-dark mb-1">
            {{ editingClient ? 'Editar Cliente API' : 'Nuevo Cliente API' }}
          </h5>
          <p class="text-muted small mb-0">Registra un cliente externo para consumir de forma segura los endpoints de verificación.</p>
        </div>

        <div class="mt-4">
          <div class="mb-3">
            <label class="form-label fw-semibold text-secondary" for="name">Nombre o Sistema</label>
            <input id="name" type="text" class="form-control" formControlName="name" placeholder="Ej: Portal RRHH, ERP Corporativo...">
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold text-secondary" for="description">Descripción</label>
            <input id="description" type="text" class="form-control" formControlName="description" placeholder="Ej: Integración para descarga masiva de certificados...">
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="rateLimitPerMinute">Límite por minuto</label>
              <input id="rateLimitPerMinute" type="number" class="form-control" formControlName="rateLimitPerMinute">
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="maxPageSize">Máximo por página</label>
              <input id="maxPageSize" type="number" class="form-control" formControlName="maxPageSize">
            </div>
          </div>

          <div class="form-check form-switch mb-2">
            <input id="isActive" type="checkbox" class="form-check-input" formControlName="isActive">
            <label class="form-check-label fw-semibold text-secondary" for="isActive">Cliente activo</label>
          </div>

          <div class="form-check form-switch mb-4">
            <input id="canDownloadFiles" type="checkbox" class="form-check-input" formControlName="canDownloadFiles">
            <label class="form-check-label fw-semibold text-secondary" for="canDownloadFiles">Permitir descarga de archivos de certificados</label>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold text-secondary" for="apiKey">API key personalizada (opcional)</label>
            <input id="apiKey" type="text" class="form-control" formControlName="apiKey" placeholder="Dejar vacío para autogenerar">
            <small class="text-muted d-block mt-1 small">En modo edición, dejar vacío mantiene la clave actual sin modificaciones.</small>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary px-4 py-2 fw-semibold" type="button" (click)="save()" [disabled]="saving">
              <i class="fas fa-save me-1"></i>
              {{ saving ? 'Guardando...' : 'Guardar Cliente' }}
            </button>
            <button class="btn btn-outline-secondary px-3 py-2" type="button" (click)="resetForm()" [disabled]="saving">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Columna derecha: Prueba Manual e Historial -->
      <div class="col-lg-7">
        <!-- Prueba manual -->
        <div class="mb-5">
          <h5 class="fw-bold text-dark mb-1">Prueba manual de API</h5>
          <p class="text-muted small mb-4">Prueba de forma inmediata la validez de un token y visualiza la respuesta simulada del servidor.</p>

          <div class="mb-3">
            <label class="form-label fw-semibold text-secondary" for="testApiKey">API key para prueba</label>
            <div class="input-group">
              <input id="testApiKey" type="text" class="form-control form-control-sm" formControlName="testApiKey" placeholder="Ingresa el token a verificar...">
              <button class="btn btn-outline-primary btn-sm fw-semibold" type="button" (click)="testApi()" [disabled]="testing">
                <i class="fas fa-vial me-1"></i>
                {{ testing ? 'Probando...' : 'Validar' }}
              </button>
            </div>
          </div>

          <div class="alert alert-info border-0 shadow-sm mt-3 mb-0" *ngIf="testMessage">
            <i class="fas fa-info-circle me-1"></i>
            {{ testMessage }}
          </div>
        </div>

        <hr class="my-4 text-muted opacity-10">

        <!-- Clientes API -->
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 class="fw-bold text-dark mb-1">Clientes API Registrados</h5>
              <p class="text-muted small mb-0">Gestión de accesos y tokens externos.</p>
            </div>
            <button class="btn btn-sm btn-outline-secondary" type="button" (click)="load()" [disabled]="loading">
              <i class="fas fa-sync-alt me-1"></i>Actualizar
            </button>
          </div>

          <div class="mt-4">
            <div class="p-4 text-center" *ngIf="loading">
              <div class="spinner-border text-primary" role="status"></div>
            </div>

            <div class="table-responsive border rounded-3 bg-white" *ngIf="!loading && clients.length > 0">
              <table class="table table-hover align-middle mb-0" style="font-size: 0.9rem;">
                <thead class="table-light text-secondary">
                  <tr>
                    <th class="ps-3">Cliente</th>
                    <th>Límites / Permisos</th>
                    <th>Estado</th>
                    <th>Último uso</th>
                    <th class="text-end pe-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let client of clients">
                    <td class="ps-3">
                      <div class="fw-semibold text-dark">{{ client.name }}</div>
                      <small class="text-muted d-block font-monospace" style="font-size: 0.75rem;">Hint: {{ client.keyHint || 'sin hint' }}</small>
                      <div *ngIf="client.description" class="small text-muted text-truncate" style="max-width: 200px;" [title]="client.description">
                        {{ client.description }}
                      </div>
                    </td>
                    <td>
                      <div class="small text-dark">{{ client.rateLimitPerMinute }} peticiones/min</div>
                      <div class="small text-muted">{{ client.maxPageSize }} reg/pág</div>
                      <div class="small" [class.text-success]="client.canDownloadFiles" [class.text-muted]="!client.canDownloadFiles">
                        <i class="fas" [class.fa-file-download]="client.canDownloadFiles" [class.fa-ban]="!client.canDownloadFiles"></i>
                        {{ client.canDownloadFiles ? ' Descargas ON' : ' Descargas OFF' }}
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class.bg-success-subtle]="client.isActive" [class.text-success]="client.isActive" [class.bg-secondary-subtle]="!client.isActive" [class.text-secondary]="!client.isActive">
                        {{ client.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="text-secondary small">
                      {{ client.lastUsedAt ? (client.lastUsedAt | date:'yyyy-MM-dd HH:mm') : 'Sin uso registrado' }}
                    </td>
                    <td class="text-end pe-3">
                      <div class="btn-group btn-group-sm shadow-sm">
                        <button class="btn btn-outline-secondary" type="button" title="Editar" (click)="edit(client)"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-outline-warning" type="button" title="Regenerar clave" (click)="rotateKey(client)" [disabled]="saving"><i class="fas fa-key"></i></button>
                        <button class="btn btn-outline-info" type="button" title="Ejecutar test" (click)="runServerTest(client)" [disabled]="testing"><i class="fas fa-vial"></i></button>
                        <button class="btn btn-outline-danger" type="button" title="Eliminar" (click)="remove(client)"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="p-4 text-center text-muted border border-dashed rounded-3 bg-light" *ngIf="!loading && clients.length === 0">
              No hay clientes API configurados.
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExternalApiSettingsComponent implements OnInit {
  form: FormGroup;
  clients: PublicApiClient[] = [];
  editingClient: PublicApiClient | null = null;
  generatedApiKey = '';
  saving = false;
  testing = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  testMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly settingsService: SettingsService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', Validators.maxLength(250)],
      isActive: [true],
      canDownloadFiles: [false],
      rateLimitPerMinute: [60, [Validators.required, Validators.min(1), Validators.max(10000)]],
      maxPageSize: [50, [Validators.required, Validators.min(1), Validators.max(500)]],
      apiKey: ['', Validators.minLength(12)],
      testApiKey: ['', Validators.minLength(12)]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.settingsService.getPublicApiClients().subscribe({
      next: (response) => {
        this.clients = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.loading = false;
      }
    });
  }

  edit(client: PublicApiClient): void {
    this.editingClient = client;
    this.generatedApiKey = '';
    this.form.patchValue({
      name: client.name,
      description: client.description || '',
      isActive: client.isActive,
      canDownloadFiles: client.canDownloadFiles,
      rateLimitPerMinute: client.rateLimitPerMinute,
      maxPageSize: client.maxPageSize,
      apiKey: '',
      testApiKey: ''
    });
  }

  resetForm(): void {
    this.editingClient = null;
    this.generatedApiKey = '';
    this.form.reset({
      name: '',
      description: '',
      isActive: true,
      canDownloadFiles: false,
      rateLimitPerMinute: 60,
      maxPageSize: 50,
      apiKey: '',
      testApiKey: ''
    });
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.testMessage = '';
    this.generatedApiKey = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const apiKey = (this.form.value.apiKey || '').trim();
    if (apiKey && apiKey.length < 12) {
      this.errorMessage = 'La API key debe tener al menos 12 caracteres';
      return;
    }

    this.saving = true;
    const payload = {
      name: this.form.value.name,
      description: this.form.value.description,
      isActive: Boolean(this.form.value.isActive),
      canDownloadFiles: Boolean(this.form.value.canDownloadFiles),
      rateLimitPerMinute: Number(this.form.value.rateLimitPerMinute),
      maxPageSize: Number(this.form.value.maxPageSize),
      apiKey: apiKey || undefined
    };

    const request = this.editingClient
      ? this.settingsService.updatePublicApiClient(this.editingClient.id, payload)
      : this.settingsService.createPublicApiClient(payload);

    request.subscribe({
      next: (response) => {
        this.generatedApiKey = response.data?.apiKey || '';
        this.successMessage = response.message || 'Cliente API guardado';
        this.saving = false;
        this.resetForm();
        this.load();
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.saving = false;
      }
    });
  }

  remove(client: PublicApiClient): void {
    if (!confirm(`Eliminar cliente API "${client.name}"?`)) return;
    this.errorMessage = '';
    this.successMessage = '';

    this.settingsService.deletePublicApiClient(client.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Cliente API eliminado';
        if (this.editingClient?.id === client.id) {
          this.resetForm();
        }
        this.load();
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  rotateKey(client: PublicApiClient): void {
    if (!confirm(`Regenerar API key para "${client.name}"? La clave anterior dejara de funcionar.`)) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.testMessage = '';
    this.generatedApiKey = '';
    this.saving = true;

    this.settingsService.rotatePublicApiClientKey(client.id).subscribe({
      next: (response) => {
        this.generatedApiKey = response.data?.apiKey || '';
        this.successMessage = response.message || 'API key regenerada';
        this.saving = false;
        this.load();
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.saving = false;
      }
    });
  }

  runServerTest(client: PublicApiClient): void {
    this.testing = true;
    this.errorMessage = '';
    this.testMessage = '';
    this.settingsService.testPublicApiClient(client.id).subscribe({
      next: (response) => {
        const result = response.data?.result;
        const visible = result?.visibleCertifications ?? 0;
        const download = result?.downloadEndpoint ? 'Descarga habilitada' : 'Descarga no habilitada';
        this.testMessage = `Test OK para ${client.name}. Visibles: ${visible}. ${download}.`;
        this.testing = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.testing = false;
      }
    });
  }

  testApi(): void {
    this.errorMessage = '';
    this.testMessage = '';

    const key = (this.form.value.testApiKey || '').trim();
    if (!key) {
      this.errorMessage = 'Debes ingresar una API key para probar';
      return;
    }

    this.testing = true;
    this.settingsService.testPublicCertificationsApi(key).subscribe({
      next: (response) => {
        const total = response.data?.pagination?.totalItems ?? 0;
        this.testMessage = `Prueba OK. Certificaciones visibles: ${total}`;
        this.testing = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.testing = false;
      }
    });
  }
}
