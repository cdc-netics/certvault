import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { SmtpProfile, SmtpProfilePayload } from '../../../core/models/smtp-profile.model';

@Component({
  selector: 'app-smtp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

    <div class="row g-5">
      <!-- Columna izquierda: Creación y Edición de Perfil -->
      <div class="col-lg-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold text-dark mb-1">
              {{ editingProfile ? 'Editar Perfil SMTP' : 'Nuevo Perfil SMTP' }}
            </h5>
            <p class="text-muted small mb-0">Configura un servidor de correo saliente para el envío de notificaciones.</p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="resetForm()" *ngIf="editingProfile">
            Cancelar
          </button>
        </div>

        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="mt-4">
          <div class="mb-3">
            <label class="form-label fw-semibold text-secondary" for="name">Nombre del perfil</label>
            <input id="name" type="text" class="form-control" formControlName="name" [class.is-invalid]="isInvalid('name')">
            <div class="invalid-feedback">El nombre es requerido.</div>
          </div>

          <div class="row">
            <div class="col-md-8 mb-3">
              <label class="form-label fw-semibold text-secondary" for="host">Host SMTP</label>
              <input id="host" type="text" class="form-control" formControlName="host" placeholder="smtp.empresa.com" [class.is-invalid]="isInvalid('host')">
              <div class="invalid-feedback">El host es requerido.</div>
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label fw-semibold text-secondary" for="port">Puerto</label>
              <input id="port" type="number" class="form-control" formControlName="port" [class.is-invalid]="isInvalid('port')">
              <div class="invalid-feedback">Puerto inválido.</div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="username">Usuario</label>
              <input id="username" type="text" class="form-control" formControlName="username" autocomplete="off">
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="password">Contraseña</label>
              <input id="password" type="password" class="form-control" formControlName="password" autocomplete="new-password">
              <small class="text-muted" *ngIf="editingProfile?.hasPassword">Dejar vacía mantiene la contraseña actual.</small>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="fromName">Nombre remitente</label>
              <input id="fromName" type="text" class="form-control" formControlName="fromName" [class.is-invalid]="isInvalid('fromName')">
              <div class="invalid-feedback">El nombre remitente es requerido.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="fromEmail">Email remitente</label>
              <input id="fromEmail" type="email" class="form-control" formControlName="fromEmail" [class.is-invalid]="isInvalid('fromEmail')">
              <div class="invalid-feedback">Email remitente inválido.</div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label fw-semibold text-secondary" for="connectionTimeout">Timeout ms</label>
              <input id="connectionTimeout" type="number" class="form-control" formControlName="connectionTimeout">
            </div>
            <div class="col-md-6 mb-3 d-flex align-items-end">
              <div>
                <div class="form-check form-switch mb-2">
                  <input id="secure" class="form-check-input" type="checkbox" formControlName="secure">
                  <label class="form-check-label fw-semibold text-secondary" for="secure">SSL/TLS directo</label>
                </div>
                <div class="form-check form-switch">
                  <input id="rejectUnauthorized" class="form-check-input" type="checkbox" formControlName="rejectUnauthorized">
                  <label class="form-check-label fw-semibold text-secondary" for="rejectUnauthorized">Validar certificado TLS</label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-check form-switch mb-4">
            <input id="isActive" class="form-check-input" type="checkbox" formControlName="isActive">
            <label class="form-check-label fw-semibold text-secondary" for="isActive">Activar este perfil al guardar</label>
          </div>

          <button type="submit" class="btn btn-primary px-4 py-2 fw-semibold" [disabled]="profileForm.invalid || saving">
            <i class="fas fa-save me-1"></i>
            {{ saving ? 'Guardando...' : 'Guardar Perfil' }}
          </button>
        </form>
      </div>

      <!-- Columna derecha: Políticas, Pruebas y Perfiles Configurados -->
      <div class="col-lg-7">
        <!-- Políticas globales -->
        <div class="mb-5">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 class="fw-bold text-dark mb-1">Políticas globales del servidor</h5>
              <p class="text-muted small mb-0">Ajustes globales para el comportamiento del correo en la plataforma.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="loadServerPolicy()" [disabled]="loadingPolicy || savingPolicy">
              <i class="fas fa-sync-alt me-1"></i>
              Actualizar
            </button>
          </div>

          <div [formGroup]="policyForm" class="mt-4 ps-1">
            <div class="form-check form-switch mb-3">
              <input id="sendBackupOnDelete" class="form-check-input" type="checkbox" formControlName="sendBackupOnDelete">
              <label class="form-check-label" for="sendBackupOnDelete">
                <span class="d-block fw-semibold text-dark">Enviar ZIP al eliminar colaborador</span>
                <span class="d-block text-muted small">Envía un archivo ZIP con sus certificaciones al borrar la cuenta de un colaborador.</span>
              </label>
            </div>

            <div class="form-check form-switch mb-4">
              <input id="requirePersonalEmail" class="form-check-input" type="checkbox" formControlName="requirePersonalEmail">
              <label class="form-check-label" for="requirePersonalEmail">
                <span class="d-block fw-semibold text-dark">Requerir correo personal</span>
                <span class="d-block text-muted small">Exige el registro de un correo alternativo de respaldo al colaborador.</span>
              </label>
            </div>

            <button type="button" class="btn btn-outline-primary px-3 fw-semibold btn-sm" (click)="saveServerPolicy()" [disabled]="loadingPolicy || savingPolicy">
              <i class="fas fa-save me-1"></i>
              {{ savingPolicy ? 'Guardando políticas...' : 'Guardar políticas globales' }}
            </button>
          </div>
        </div>

        <hr class="my-4 text-muted opacity-10">

        <!-- Prueba de conexión -->
        <div class="mb-5">
          <h5 class="fw-bold text-dark mb-1">Prueba de conexión y envío</h5>
          <p class="text-muted small mb-4">Valida el funcionamiento de las credenciales de correo mediante el envío de un correo de prueba.</p>

          <div class="row g-2 align-items-end ps-1">
            <div class="col-md-8">
              <label class="form-label fw-semibold text-secondary" for="testEmail">Destinatario de prueba</label>
              <input id="testEmail" type="email" class="form-control" [formControl]="testEmail" placeholder="correo@empresa.com">
            </div>
            <div class="col-md-4">
              <button type="button" class="btn btn-outline-primary w-100 fw-semibold" [disabled]="!selectedProfileId || testing" (click)="testSelectedProfile()">
                <i class="fas fa-paper-plane me-1"></i>
                {{ testing ? 'Probando...' : 'Probar Seleccionado' }}
              </button>
            </div>
          </div>
          <small class="text-muted mt-2 d-block small">La prueba valida el login SMTP en el servidor seleccionado y, de ingresar un correo, realiza un envío real.</small>
        </div>

        <hr class="my-4 text-muted opacity-10">

        <!-- Perfiles configurados -->
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 class="fw-bold text-dark mb-1">Perfiles configurados</h5>
              <p class="text-muted small mb-0">Listado de servidores SMTP creados en la plataforma.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="loadProfiles()" [disabled]="loading">
              <i class="fas fa-sync-alt me-1"></i>
              Actualizar
            </button>
          </div>

          <div class="mt-4">
            <div class="text-center p-4" *ngIf="loading">
              <div class="spinner-border text-primary" role="status"></div>
            </div>

            <div class="table-responsive border rounded-3 bg-white" *ngIf="!loading && profiles.length > 0">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr>
                    <th class="ps-3">Perfil</th>
                    <th>Servidor</th>
                    <th>Remitente</th>
                    <th>Estado</th>
                    <th>Última prueba</th>
                    <th class="text-end pe-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let profile of profiles" [class.table-success-subtle]="profile.isActive">
                    <td class="ps-3">
                      <div class="form-check mb-0">
                        <input class="form-check-input cursor-pointer" type="radio" name="selectedProfile" [value]="profile.id" [(ngModel)]="selectedProfileId" id="profile-{{profile.id}}">
                        <label class="form-check-label fw-semibold text-dark cursor-pointer" for="profile-{{profile.id}}">{{ profile.name }}</label>
                      </div>
                      <small class="text-muted d-block ps-4">{{ profile.username || 'Sin autenticación' }}</small>
                    </td>
                    <td>
                      <span class="fw-medium text-dark">{{ profile.host }}:{{ profile.port }}</span>
                      <span class="badge bg-light text-dark border ms-1 small" style="font-size: 0.75rem;">
                        {{ profile.secure ? 'SSL' : 'STARTTLS' }}
                      </span>
                    </td>
                    <td>
                      <span class="text-dark">{{ profile.fromName }}</span>
                      <small class="text-muted d-block">{{ profile.fromEmail }}</small>
                    </td>
                    <td>
                      <span class="badge" [class.bg-success-subtle]="profile.isActive" [class.text-success]="profile.isActive" [class.bg-secondary-subtle]="!profile.isActive" [class.text-secondary]="!profile.isActive">
                        {{ profile.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" *ngIf="profile.lastTestAt" [class.bg-success-subtle]="profile.lastTestSuccess" [class.text-success]="profile.lastTestSuccess" [class.bg-danger-subtle]="profile.lastTestSuccess === false" [class.text-danger]="profile.lastTestSuccess === false">
                        {{ profile.lastTestSuccess ? 'OK' : 'Error' }}
                      </span>
                      <div class="text-muted small mt-1" style="font-size: 0.75rem; max-width: 150px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" [title]="profile.lastTestMessage">
                        {{ profile.lastTestMessage || 'Sin pruebas' }}
                      </div>
                    </td>
                    <td class="text-end pe-3">
                      <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-secondary" title="Editar" (click)="editProfile(profile)">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success" title="Activar" (click)="activateProfile(profile)" [disabled]="profile.isActive">
                          <i class="fas fa-check"></i>
                        </button>
                        <button type="button" class="btn btn-outline-warning" title="Desactivar" (click)="deactivateProfile(profile)" [disabled]="!profile.isActive">
                          <i class="fas fa-ban"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" title="Eliminar" (click)="deleteProfile(profile)">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="p-4 text-center text-muted border border-dashed rounded-3 bg-light" *ngIf="!loading && profiles.length === 0">
              No hay perfiles SMTP configurados.
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SmtpSettingsComponent implements OnInit {
  profiles: SmtpProfile[] = [];
  profileForm: FormGroup;
  policyForm: FormGroup;
  testEmail: FormControl<string | null>;
  editingProfile: SmtpProfile | null = null;
  selectedProfileId = '';
  loading = false;
  saving = false;
  testing = false;
  loadingPolicy = false;
  savingPolicy = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly settingsService: SettingsService
  ) {
    this.testEmail = this.fb.control('', [Validators.email]);
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      host: ['', Validators.required],
      port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
      secure: [false],
      username: [''],
      password: [''],
      fromName: ['CertiVault', [Validators.required, Validators.maxLength(120)]],
      fromEmail: ['', [Validators.required, Validators.email]],
      isActive: [false],
      rejectUnauthorized: [false],
      connectionTimeout: [15000, [Validators.min(3000), Validators.max(60000)]]
    });
    this.policyForm = this.fb.group({
      sendBackupOnDelete: [true],
      requirePersonalEmail: [true]
    });
  }

  ngOnInit(): void {
    this.loadServerPolicy();
    this.loadProfiles();
  }

  loadServerPolicy(): void {
    this.loadingPolicy = true;
    this.settingsService.getServerPolicy().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.policyForm.patchValue({
            sendBackupOnDelete: response.data.sendBackupOnDelete !== false,
            requirePersonalEmail: response.data.requirePersonalEmail !== false
          }, { emitEvent: false });
        }
        this.loadingPolicy = false;
      },
      error: () => {
        this.loadingPolicy = false;
      }
    });
  }

  saveServerPolicy(): void {
    this.savingPolicy = true;
    this.clearMessages();
    const value = this.policyForm.value;

    this.settingsService.updateServerPolicy({
      sendBackupOnDelete: Boolean(value.sendBackupOnDelete),
      requirePersonalEmail: Boolean(value.requirePersonalEmail)
    }).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Politicas del servidor actualizadas';
        this.savingPolicy = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.savingPolicy = false;
      }
    });
  }

  loadProfiles(): void {
    this.loading = true;
    this.clearMessages();
    this.settingsService.getSmtpProfiles().subscribe({
      next: (response) => {
        this.profiles = response.data || [];
        this.selectedProfileId = this.profiles.find(profile => profile.isActive)?.id || this.profiles[0]?.id || '';
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.loading = false;
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.clearMessages();
    const payload = this.buildPayload();
    const request = this.editingProfile
      ? this.settingsService.updateSmtpProfile(this.editingProfile.id, payload)
      : this.settingsService.createSmtpProfile(payload);

    request.subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Perfil SMTP guardado';
        this.saving = false;
        this.resetForm();
        this.loadProfiles();
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.saving = false;
      }
    });
  }

  editProfile(profile: SmtpProfile): void {
    this.editingProfile = profile;
    this.profileForm.patchValue({
      name: profile.name,
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      username: profile.username || '',
      password: '',
      fromName: profile.fromName,
      fromEmail: profile.fromEmail,
      isActive: profile.isActive,
      rejectUnauthorized: profile.rejectUnauthorized,
      connectionTimeout: profile.connectionTimeout
    });
  }

  resetForm(): void {
    this.editingProfile = null;
    this.profileForm.reset({
      name: '',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromName: 'CertiVault',
      fromEmail: '',
      isActive: false,
      rejectUnauthorized: false,
      connectionTimeout: 15000
    });
  }

  activateProfile(profile: SmtpProfile): void {
    this.clearMessages();
    this.settingsService.activateSmtpProfile(profile.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Perfil SMTP activado';
        this.loadProfiles();
      },
      error: (error) => this.errorMessage = error.message
    });
  }

  deactivateProfile(profile: SmtpProfile): void {
    this.clearMessages();
    this.settingsService.deactivateSmtpProfile(profile.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Perfil SMTP desactivado';
        this.loadProfiles();
      },
      error: (error) => this.errorMessage = error.message
    });
  }

  deleteProfile(profile: SmtpProfile): void {
    if (!confirm(`Eliminar perfil SMTP "${profile.name}"?`)) return;

    this.clearMessages();
    this.settingsService.deleteSmtpProfile(profile.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Perfil SMTP eliminado';
        this.loadProfiles();
      },
      error: (error) => this.errorMessage = error.message
    });
  }

  testSelectedProfile(): void {
    if (!this.selectedProfileId) return;
    if (this.testEmail.invalid) {
      this.testEmail.markAsTouched();
      return;
    }

    this.testing = true;
    this.clearMessages();
    this.settingsService.testSmtpProfile(this.selectedProfileId, this.testEmail.value || undefined).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Prueba SMTP exitosa';
        this.testing = false;
        this.loadProfiles();
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.testing = false;
        this.loadProfiles();
      }
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return Boolean(control?.invalid && control?.touched);
  }

  private buildPayload(): SmtpProfilePayload {
    const value = this.profileForm.value;
    const payload: SmtpProfilePayload = {
      name: value.name,
      host: value.host,
      port: Number(value.port),
      secure: Boolean(value.secure),
      username: value.username || undefined,
      fromName: value.fromName,
      fromEmail: value.fromEmail,
      isActive: Boolean(value.isActive),
      rejectUnauthorized: Boolean(value.rejectUnauthorized),
      connectionTimeout: Number(value.connectionTimeout)
    };

    if (value.password) {
      payload.password = value.password;
    }

    return payload;
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
