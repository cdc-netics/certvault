import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { SettingsService } from '../../../core/services/settings.service';
import { SmtpProfile, SmtpProfilePayload } from '../../../core/models/smtp-profile.model';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-smtp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1">
            <i class="fas fa-envelope-open-text me-2"></i>
            Perfiles SMTP
          </h1>
          <p class="text-muted mb-0">Configura el servidor activo para verificaciones de cuenta y recuperacion de contraseña.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="row g-4">
        <div class="col-lg-5">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">{{ editingProfile ? 'Editar Perfil' : 'Nuevo Perfil' }}</h5>
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="resetForm()" *ngIf="editingProfile">
                Cancelar
              </button>
            </div>
            <div class="card-body">
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <div class="mb-3">
                  <label class="form-label" for="name">Nombre del perfil</label>
                  <input id="name" type="text" class="form-control" formControlName="name" [class.is-invalid]="isInvalid('name')">
                  <div class="invalid-feedback">El nombre es requerido.</div>
                </div>

                <div class="row">
                  <div class="col-md-8 mb-3">
                    <label class="form-label" for="host">Host SMTP</label>
                    <input id="host" type="text" class="form-control" formControlName="host" placeholder="smtp.empresa.com" [class.is-invalid]="isInvalid('host')">
                    <div class="invalid-feedback">El host es requerido.</div>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label" for="port">Puerto</label>
                    <input id="port" type="number" class="form-control" formControlName="port" [class.is-invalid]="isInvalid('port')">
                    <div class="invalid-feedback">Puerto invalido.</div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="username">Usuario</label>
                    <input id="username" type="text" class="form-control" formControlName="username" autocomplete="off">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="password">Contraseña</label>
                    <input id="password" type="password" class="form-control" formControlName="password" autocomplete="new-password">
                    <small class="text-muted" *ngIf="editingProfile?.hasPassword">Dejar vacia mantiene la contraseña actual.</small>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="fromName">Nombre remitente</label>
                    <input id="fromName" type="text" class="form-control" formControlName="fromName" [class.is-invalid]="isInvalid('fromName')">
                    <div class="invalid-feedback">El nombre remitente es requerido.</div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="fromEmail">Email remitente</label>
                    <input id="fromEmail" type="email" class="form-control" formControlName="fromEmail" [class.is-invalid]="isInvalid('fromEmail')">
                    <div class="invalid-feedback">Email remitente invalido.</div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="connectionTimeout">Timeout ms</label>
                    <input id="connectionTimeout" type="number" class="form-control" formControlName="connectionTimeout">
                  </div>
                  <div class="col-md-6 mb-3 d-flex align-items-end">
                    <div>
                      <div class="form-check form-switch mb-2">
                        <input id="secure" class="form-check-input" type="checkbox" formControlName="secure">
                        <label class="form-check-label" for="secure">SSL/TLS directo</label>
                      </div>
                      <div class="form-check form-switch">
                        <input id="rejectUnauthorized" class="form-check-input" type="checkbox" formControlName="rejectUnauthorized">
                        <label class="form-check-label" for="rejectUnauthorized">Validar certificado TLS</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card bg-light border-0 mb-3">
                  <div class="card-body py-2 px-3">
                    <h6 class="fw-bold text-secondary mb-2 small"><i class="fas fa-sliders-h me-1 text-primary"></i> Politicas del Servidor</h6>
                    
                    <div class="form-check form-switch mb-2">
                      <input id="sendBackupOnDelete" class="form-check-input" type="checkbox" formControlName="sendBackupOnDelete">
                      <label class="form-check-label small cursor-pointer" for="sendBackupOnDelete">
                        <strong>Enviar ZIP al eliminar colaborador</strong>
                        <span class="d-block text-muted" style="font-size: 0.75rem;">Envia un ZIP con sus certificados al borrar su cuenta.</span>
                      </label>
                    </div>

                    <div class="form-check form-switch mb-0">
                      <input id="requirePersonalEmail" class="form-check-input" type="checkbox" formControlName="requirePersonalEmail">
                      <label class="form-check-label small cursor-pointer" for="requirePersonalEmail">
                        <strong>Requerir correo personal</strong>
                        <span class="d-block text-muted" style="font-size: 0.75rem;">Exige registrar el correo de respaldo al colaborador.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="form-check form-switch mb-3">
                  <input id="isActive" class="form-check-input" type="checkbox" formControlName="isActive">
                  <label class="form-check-label" for="isActive">Activar este perfil al guardar</label>
                </div>

                <button type="submit" class="btn btn-primary" [disabled]="profileForm.invalid || saving">
                  <i class="fas fa-save me-1"></i>
                  {{ saving ? 'Guardando...' : 'Guardar Perfil' }}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="card mb-3">
            <div class="card-header">
              <h5 class="mb-0">Prueba de conexion y envio</h5>
            </div>
            <div class="card-body">
              <div class="row g-2 align-items-end">
                <div class="col-md-8">
                  <label class="form-label" for="testEmail">Destinatario de prueba</label>
                  <input id="testEmail" type="email" class="form-control" [formControl]="testEmail" placeholder="correo@empresa.com">
                </div>
                <div class="col-md-4">
                  <button type="button" class="btn btn-outline-primary w-100" [disabled]="!selectedProfileId || testing" (click)="testSelectedProfile()">
                    <i class="fas fa-paper-plane me-1"></i>
                    {{ testing ? 'Probando...' : 'Probar Seleccionado' }}
                  </button>
                </div>
              </div>
              <small class="text-muted">La prueba valida login SMTP y, si ingresas destinatario, envia un correo real.</small>
            </div>
          </div>

          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Perfiles configurados</h5>
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="loadProfiles()" [disabled]="loading">
                <i class="fas fa-sync-alt me-1"></i>
                Actualizar
              </button>
            </div>
            <div class="card-body p-0">
              <div class="text-center p-4" *ngIf="loading">
                <div class="spinner-border text-primary" role="status"></div>
              </div>

              <div class="table-responsive" *ngIf="!loading && profiles.length > 0">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Perfil</th>
                      <th>Servidor</th>
                      <th>Remitente</th>
                      <th>Estado</th>
                      <th>Ultima prueba</th>
                      <th class="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let profile of profiles" [class.table-success]="profile.isActive">
                      <td>
                        <div class="form-check">
                          <input class="form-check-input" type="radio" name="selectedProfile" [value]="profile.id" [(ngModel)]="selectedProfileId">
                          <label class="form-check-label fw-semibold">{{ profile.name }}</label>
                        </div>
                        <small class="text-muted">{{ profile.username || 'Sin autenticacion' }}</small>
                      </td>
                      <td>{{ profile.host }}:{{ profile.port }} <span class="badge bg-light text-dark">{{ profile.secure ? 'SSL' : 'STARTTLS' }}</span></td>
                      <td>{{ profile.fromName }}<br><small class="text-muted">{{ profile.fromEmail }}</small></td>
                      <td>
                        <span class="badge" [class.bg-success]="profile.isActive" [class.bg-secondary]="!profile.isActive">
                          {{ profile.isActive ? 'Activo' : 'Inactivo' }}
                        </span>
                        <div class="mt-1" style="font-size: 0.7rem; line-height: 1.2;">
                          <span class="text-success me-1" *ngIf="profile.sendBackupOnDelete" title="Respaldo al eliminar activo"><i class="fas fa-file-archive"></i> ZIP</span>
                          <span class="text-secondary me-1" *ngIf="!profile.sendBackupOnDelete" title="Respaldo al eliminar inactivo"><i class="fas fa-file-archive text-muted"></i> ZIP Off</span>
                          <span class="text-primary" *ngIf="profile.requirePersonalEmail" title="Email personal obligatorio"><i class="fas fa-id-card"></i> Oblig.</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" *ngIf="profile.lastTestAt" [class.bg-success]="profile.lastTestSuccess" [class.bg-danger]="profile.lastTestSuccess === false">
                          {{ profile.lastTestSuccess ? 'OK' : 'Error' }}
                        </span>
                        <div><small class="text-muted">{{ profile.lastTestMessage || 'Sin pruebas' }}</small></div>
                      </td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button type="button" class="btn btn-outline-primary" (click)="editProfile(profile)">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button type="button" class="btn btn-outline-success" (click)="activateProfile(profile)" [disabled]="profile.isActive">
                            <i class="fas fa-check"></i>
                          </button>
                          <button type="button" class="btn btn-outline-warning" (click)="deactivateProfile(profile)" [disabled]="!profile.isActive">
                            <i class="fas fa-ban"></i>
                          </button>
                          <button type="button" class="btn btn-outline-danger" (click)="deleteProfile(profile)">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="p-4 text-center text-muted" *ngIf="!loading && profiles.length === 0">
                No hay perfiles SMTP configurados.
              </div>
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
  testEmail: FormControl<string | null>;
  editingProfile: SmtpProfile | null = null;
  selectedProfileId = '';
  loading = false;
  saving = false;
  testing = false;
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
      connectionTimeout: [15000, [Validators.min(3000), Validators.max(60000)]],
      sendBackupOnDelete: [true],
      requirePersonalEmail: [true]
    });
  }

  ngOnInit(): void {
    this.loadProfiles();
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
      connectionTimeout: profile.connectionTimeout,
      sendBackupOnDelete: profile.sendBackupOnDelete !== false,
      requirePersonalEmail: profile.requirePersonalEmail !== false
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
      connectionTimeout: 15000,
      sendBackupOnDelete: true,
      requirePersonalEmail: true
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
      connectionTimeout: Number(value.connectionTimeout),
      sendBackupOnDelete: Boolean(value.sendBackupOnDelete),
      requirePersonalEmail: Boolean(value.requirePersonalEmail)
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
