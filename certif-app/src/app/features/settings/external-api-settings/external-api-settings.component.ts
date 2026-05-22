import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { PublicApiClient, SettingsService } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-external-api-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1"><i class="fas fa-plug me-2"></i>API Externa</h1>
          <p class="text-muted mb-0">Configura y prueba el acceso externo de certificaciones desde esta pantalla.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>

      <app-settings-nav></app-settings-nav>

      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="alert alert-warning" *ngIf="generatedApiKey">
        <strong>API key generada:</strong> {{ generatedApiKey }}
        <div><small>Copiala ahora. Luego solo quedara el hint en pantalla.</small></div>
      </div>

      <div class="row g-4" [formGroup]="form">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">{{ editingClient ? 'Editar cliente API' : 'Nuevo cliente API' }}</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                  <label class="form-label" for="name">Nombre</label>
                  <input id="name" type="text" class="form-control" formControlName="name" placeholder="ERP, Partner X, Integracion BI...">
                </div>

                <div class="mb-3">
                  <label class="form-label" for="description">Descripcion</label>
                  <input id="description" type="text" class="form-control" formControlName="description" placeholder="Descripcion opcional del cliente">
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="rateLimitPerMinute">Limite por minuto</label>
                    <input id="rateLimitPerMinute" type="number" class="form-control" formControlName="rateLimitPerMinute">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="maxPageSize">Maximo por pagina</label>
                    <input id="maxPageSize" type="number" class="form-control" formControlName="maxPageSize">
                  </div>
                </div>

                <div class="form-check form-switch mb-2">
                  <input id="isActive" type="checkbox" class="form-check-input" formControlName="isActive">
                  <label class="form-check-label" for="isActive">Cliente activo</label>
                </div>

                <div class="form-check form-switch mb-3">
                  <input id="canDownloadFiles" type="checkbox" class="form-check-input" formControlName="canDownloadFiles">
                  <label class="form-check-label" for="canDownloadFiles">Permitir descarga de certificados</label>
                </div>

                <div class="mb-3">
                  <label class="form-label" for="apiKey">API key (opcional)</label>
                  <input id="apiKey" type="text" class="form-control" formControlName="apiKey" placeholder="Si va vacia, se genera automaticamente al crear">
                  <small class="text-muted">En edicion, vacio = mantener clave actual.</small>
                </div>

                <div class="d-flex gap-2">
                  <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving">
                    <i class="fas fa-save me-1"></i>
                    {{ saving ? 'Guardando...' : 'Guardar cliente' }}
                  </button>
                  <button class="btn btn-outline-secondary" type="button" (click)="resetForm()" [disabled]="saving">
                    Limpiar
                  </button>
                </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Prueba manual por API key</h5>
            </div>
            <div class="card-body">
              <p class="text-muted">Usa una API key para probar lectura directa del endpoint externo.</p>

              <div class="mb-3">
                <label class="form-label" for="testApiKey">API key para prueba</label>
                <input id="testApiKey" type="text" class="form-control" formControlName="testApiKey" placeholder="Ingresa la API key para probar">
              </div>

              <button class="btn btn-outline-primary" type="button" (click)="testApi()" [disabled]="testing">
                <i class="fas fa-vial me-1"></i>
                {{ testing ? 'Probando...' : 'Probar API externa' }}
              </button>

              <div class="alert alert-info mt-3 mb-0" *ngIf="testMessage">{{ testMessage }}</div>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Clientes API</h5>
              <button class="btn btn-sm btn-outline-secondary" type="button" (click)="load()" [disabled]="loading">
                <i class="fas fa-sync-alt me-1"></i>Actualizar
              </button>
            </div>
            <div class="card-body p-0">
              <div class="p-4 text-center" *ngIf="loading">
                <div class="spinner-border" role="status"></div>
              </div>

              <div class="table-responsive" *ngIf="!loading && clients.length > 0">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Cliente</th>
                      <th>Limites</th>
                      <th>Estado</th>
                      <th>Ultimo uso</th>
                      <th class="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let client of clients">
                      <td>
                        <div class="fw-semibold">{{ client.name }}</div>
                        <small class="text-muted">{{ client.keyHint || 'sin hint' }}</small>
                        <div *ngIf="client.description" class="small text-muted">{{ client.description }}</div>
                      </td>
                      <td>
                        <div class="small">{{ client.rateLimitPerMinute }}/min</div>
                        <div class="small">{{ client.maxPageSize }}/pagina</div>
                        <div class="small" [class.text-success]="client.canDownloadFiles" [class.text-muted]="!client.canDownloadFiles">
                          {{ client.canDownloadFiles ? 'Descarga ON' : 'Descarga OFF' }}
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class.bg-success]="client.isActive" [class.bg-secondary]="!client.isActive">
                          {{ client.isActive ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>
                        <small>{{ client.lastUsedAt ? (client.lastUsedAt | date:'yyyy-MM-dd HH:mm') : 'Sin uso' }}</small>
                      </td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" type="button" (click)="edit(client)"><i class="fas fa-edit"></i></button>
                          <button class="btn btn-outline-warning" type="button" (click)="rotateKey(client)" [disabled]="saving"><i class="fas fa-key"></i></button>
                          <button class="btn btn-outline-info" type="button" (click)="runServerTest(client)" [disabled]="testing"><i class="fas fa-vial"></i></button>
                          <button class="btn btn-outline-danger" type="button" (click)="remove(client)"><i class="fas fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="p-4 text-center text-muted" *ngIf="!loading && clients.length === 0">
                No hay clientes API configurados.
              </div>
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
