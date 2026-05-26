import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SettingsService, SecuritySettingsData } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2">
          <i class="fas fa-cog me-2"></i> Configuraciones
        </h1>
      </div>

      <app-settings-nav></app-settings-nav>

      <div class="row">
        <div class="col-lg-8">
          <div class="card shadow-sm border-0 rounded-3">
            <div class="card-header bg-dark text-white py-3 rounded-top-3">
              <h5 class="mb-0 card-title">
                <i class="fas fa-shield-alt me-2 text-warning"></i>
                Políticas de Seguridad y Contraseñas
              </h5>
            </div>
            <div class="card-body p-4">
              <div class="alert alert-info border-0 shadow-sm mb-4">
                <div class="d-flex align-items-center">
                  <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                  <div>
                    <h6 class="alert-heading mb-1 fw-bold">Políticas de Expiración de Claves</h6>
                    <p class="mb-0 text-muted small">
                      Configure la caducidad obligatoria de contraseñas para los usuarios. Al activarla, el sistema enviará alertas por correo a los 15, 10, 5, 3 y 1 días antes de expirar. Al cumplirse el plazo, se les exigirá cambiar la contraseña en su próximo inicio de sesión.
                    </p>
                  </div>
                </div>
              </div>

              <form [formGroup]="securityForm" (ngSubmit)="onSubmit()" novalidate>
                <!-- Interruptor para Activar/Desactivar Expiración -->
                <div class="form-check form-switch mb-4 p-3 border rounded bg-light d-flex align-items-center justify-content-between">
                  <div>
                    <label class="form-check-label h6 mb-1 fw-bold text-dark" for="passwordExpirationEnabled">
                      Habilitar Expiración de Contraseñas
                    </label>
                    <div class="text-muted small">Activa la caducidad periódica obligatoria de claves de acceso.</div>
                  </div>
                  <input 
                    class="form-check-input fs-4 me-1" 
                    type="checkbox" 
                    id="passwordExpirationEnabled" 
                    formControlName="passwordExpirationEnabled"
                    style="cursor: pointer;">
                </div>

                <!-- Meses de Duración -->
                <div class="mb-4" *ngIf="securityForm.get('passwordExpirationEnabled')?.value">
                  <label for="passwordExpirationMonths" class="form-label fw-bold text-dark">
                    Duración de la Contraseña (meses) <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-calendar-alt text-muted"></i>
                    </span>
                    <input 
                      type="number" 
                      class="form-control border-start-0 ps-0" 
                      id="passwordExpirationMonths" 
                      formControlName="passwordExpirationMonths"
                      min="1" 
                      max="12"
                      [class.is-invalid]="passwordExpirationMonths?.invalid && passwordExpirationMonths?.touched"
                      placeholder="Ej: 3">
                    <span class="input-group-text bg-light text-muted">Meses</span>
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="passwordExpirationMonths?.invalid && passwordExpirationMonths?.touched">
                    <small *ngIf="passwordExpirationMonths?.errors?.['required']" class="d-block text-danger">Este campo es requerido</small>
                    <small *ngIf="passwordExpirationMonths?.errors?.['min']" class="d-block text-danger">La duración mínima es de 1 mes</small>
                    <small *ngIf="passwordExpirationMonths?.errors?.['max']" class="d-block text-danger">La duración máxima es de 12 meses</small>
                  </div>
                  <div class="form-text text-muted mt-1">
                    Defina el número de meses que una contraseña será válida antes de requerir su renovación.
                  </div>
                </div>

                <!-- Botones -->
                <div class="d-flex justify-content-end gap-2 pt-3 border-top mt-4">
                  <button 
                    type="submit" 
                    class="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                    [disabled]="securityForm.invalid || loading">
                    <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <i *ngIf="!loading" class="fas fa-save"></i>
                    {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SecuritySettingsComponent implements OnInit, OnDestroy {
  securityForm!: FormGroup;
  loading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadSettings();

    // Dinámicamente activar/desactivar validadores de meses según el estado del switch
    this.securityForm.get('passwordExpirationEnabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled) => {
        const monthsControl = this.securityForm.get('passwordExpirationMonths');
        if (enabled) {
          monthsControl?.setValidators([Validators.required, Validators.min(1), Validators.max(12)]);
        } else {
          monthsControl?.clearValidators();
        }
        monthsControl?.updateValueAndValidity();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.securityForm = this.fb.group({
      passwordExpirationEnabled: [false],
      passwordExpirationMonths: [3, [Validators.required, Validators.min(1), Validators.max(12)]]
    });
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService.getSecuritySettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.securityForm.patchValue({
              passwordExpirationEnabled: response.data.passwordExpirationEnabled,
              passwordExpirationMonths: response.data.passwordExpirationMonths || 3
            });
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando configuraciones de seguridad:', error);
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.securityForm.invalid) {
      return;
    }

    this.loading = true;
    const payload: SecuritySettingsData = this.securityForm.value;

    this.settingsService.updateSecuritySettings(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Políticas de seguridad actualizadas con éxito.');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error guardando configuraciones de seguridad:', error);
          alert('Error al guardar: ' + error.message);
          this.loading = false;
        }
      });
  }

  get passwordExpirationMonths() {
    return this.securityForm.get('passwordExpirationMonths');
  }
}
