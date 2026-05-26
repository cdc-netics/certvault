import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-force-password-change',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div class="row justify-content-center w-100">
        <div class="col-md-6 col-lg-5">
          <div class="card shadow-lg border-0 rounded-3">
            <!-- Header con gradiente premium -->
            <div class="card-header text-center py-4 bg-dark text-white rounded-top-3">
              <i class="fas fa-shield-alt fa-3x text-warning mb-2 animate-pulse"></i>
              <h4 class="mb-1 fw-bold">Actualización Obligatoria</h4>
              <p class="mb-0 text-muted small">Por motivos de seguridad, es necesario actualizar tus datos.</p>
            </div>
            
            <div class="card-body p-4">
              <!-- Mensaje informativo -->
              <div class="alert alert-warning border-0 shadow-sm mb-4 small">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Tu contraseña ha expirado o un administrador ha solicitado que la renueves antes de continuar.
              </div>

              <form [formGroup]="changeForm" (ngSubmit)="onSubmit()" novalidate>
                <!-- Contraseña Actual -->
                <div class="mb-3">
                  <label for="currentPassword" class="form-label fw-bold text-dark">
                    Contraseña Actual <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-lock text-muted"></i>
                    </span>
                    <input 
                      type="password" 
                      class="form-control border-start-0 ps-0" 
                      id="currentPassword" 
                      formControlName="currentPassword"
                      [class.is-invalid]="currentPassword?.invalid && currentPassword?.touched"
                      placeholder="Ingresa tu contraseña actual">
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="currentPassword?.invalid && currentPassword?.touched">
                    <small *ngIf="currentPassword?.errors?.['required']" class="text-danger">La contraseña actual es requerida</small>
                  </div>
                </div>

                <!-- Correo Personal (Condicional si falta o es idéntico al corporativo) -->
                <div class="mb-3" *ngIf="requiresPersonalEmail">
                  <label for="personalEmail" class="form-label fw-bold text-dark">
                    Correo Personal de Respaldo <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-envelope text-muted"></i>
                    </span>
                    <input 
                      type="email" 
                      class="form-control border-start-0 ps-0" 
                      id="personalEmail" 
                      formControlName="personalEmail"
                      [class.is-invalid]="personalEmail?.invalid && personalEmail?.touched"
                      placeholder="correo_personal@gmail.com">
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="personalEmail?.invalid && personalEmail?.touched">
                    <small *ngIf="personalEmail?.errors?.['required']" class="text-danger">El correo personal es requerido</small>
                    <small *ngIf="personalEmail?.errors?.['email']" class="text-danger">Correo personal inválido</small>
                    <small *ngIf="personalEmail?.errors?.['emailsIdentical']" class="text-danger">El correo personal no puede ser igual al de la empresa</small>
                  </div>
                  <div class="form-text text-muted mt-1 small">
                    Necesitamos tu correo personal para enviarte respaldos de seguridad en caso de ser necesario.
                  </div>
                </div>

                <!-- Nueva Contraseña -->
                <div class="mb-3">
                  <label for="newPassword" class="form-label fw-bold text-dark">
                    Nueva Contraseña <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-key text-muted"></i>
                    </span>
                    <input 
                      type="password" 
                      class="form-control border-start-0 ps-0" 
                      id="newPassword" 
                      formControlName="newPassword"
                      [class.is-invalid]="newPassword?.invalid && newPassword?.touched"
                      placeholder="Mínimo 6 caracteres">
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="newPassword?.invalid && newPassword?.touched">
                    <small *ngIf="newPassword?.errors?.['required']" class="text-danger">La nueva contraseña es requerida</small>
                    <small *ngIf="newPassword?.errors?.['minlength']" class="text-danger">Mínimo 6 caracteres</small>
                    <small *ngIf="newPassword?.errors?.['pattern']" class="text-danger">Debe contener una mayúscula, una minúscula y un número</small>
                  </div>
                  <small class="form-text text-muted mt-1 d-block small">
                    Debe contener al menos una letra mayúscula, una minúscula y un número.
                  </small>
                </div>

                <!-- Confirmar Nueva Contraseña -->
                <div class="mb-4">
                  <label for="confirmPassword" class="form-label fw-bold text-dark">
                    Confirmar Nueva Contraseña <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-check-double text-muted"></i>
                    </span>
                    <input 
                      type="password" 
                      class="form-control border-start-0 ps-0" 
                      id="confirmPassword" 
                      formControlName="confirmPassword"
                      [class.is-invalid]="confirmPassword?.invalid && confirmPassword?.touched"
                      placeholder="Repite la nueva contraseña">
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="confirmPassword?.invalid && confirmPassword?.touched">
                    <small *ngIf="confirmPassword?.errors?.['passwordMismatch']" class="text-danger">Las contraseñas no coinciden</small>
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div class="d-grid gap-2">
                  <button 
                    type="submit" 
                    class="btn btn-primary btn-lg fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    [disabled]="changeForm.invalid || loading">
                    <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <i *ngIf="!loading" class="fas fa-check-circle"></i>
                    {{ loading ? 'Actualizando...' : 'Actualizar y Continuar' }}
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-outline-secondary"
                    (click)="logout()"
                    [disabled]="loading">
                    <i class="fas fa-sign-out-alt me-1"></i> Cerrar Sesión
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
export class ForcePasswordChangeComponent implements OnInit, OnDestroy {
  changeForm!: FormGroup;
  loading = false;
  requiresPersonalEmail = false;
  currentUser: User | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.checkPersonalEmailRequirement();
    this.initializeForm();

    // Revalidar confirmPassword cuando newPassword cambie
    this.changeForm.get('newPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.changeForm.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkPersonalEmailRequirement(): void {
    if (this.currentUser) {
      const email = (this.currentUser.email || '').toLowerCase().trim();
      const personalEmail = (this.currentUser.personalEmail || '').toLowerCase().trim();
      
      // Requiere correo personal si falta o es idéntico al corporativo
      this.requiresPersonalEmail = !personalEmail || email === personalEmail;
    }
  }

  private initializeForm(): void {
    this.changeForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(6), 
        Validators.pattern(this.passwordComplexityRegex)
      ]],
      confirmPassword: ['']
    });

    this.changeForm.get('confirmPassword')?.setValidators([
      this.confirmPasswordValidator.bind(this)
    ]);

    if (this.requiresPersonalEmail) {
      this.changeForm.addControl(
        'personalEmail',
        this.fb.control('', [
          Validators.required,
          Validators.email,
          this.emailsDifferentValidator.bind(this)
        ])
      );
    }
  }

  private confirmPasswordValidator(control: any) {
    const newPassword = this.changeForm?.get('newPassword')?.value;
    const confirmPassword = control.value;
    if (!newPassword && !confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private emailsDifferentValidator(control: any) {
    if (!this.currentUser) return null;
    const email = (this.currentUser.email || '').toLowerCase().trim();
    const personalEmail = (control.value || '').toLowerCase().trim();
    if (!email || !personalEmail) {
      return null;
    }
    return email !== personalEmail ? null : { emailsIdentical: true };
  }

  onSubmit(): void {
    if (this.changeForm.invalid) {
      return;
    }

    this.loading = true;
    const { currentPassword, newPassword, personalEmail } = this.changeForm.value;

    const payload: { currentPassword: string; newPassword: string; personalEmail?: string } = {
      currentPassword,
      newPassword
    };

    if (this.requiresPersonalEmail && personalEmail) {
      payload.personalEmail = personalEmail;
    }

    this.authService.changePassword(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Tus datos y contraseña se han actualizado exitosamente.');
            
            // Actualizar el estado del usuario local (desmarcar mustChangePassword)
            if (this.currentUser) {
              this.currentUser.mustChangePassword = false;
              if (personalEmail) {
                this.currentUser.personalEmail = personalEmail;
              }
              this.authService.setCurrentUser(this.currentUser);
            }
            
            // Redirigir al dashboard
            this.router.navigate(['/dashboard']);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cambiar la contraseña forzada:', error);
          alert('Error: ' + error.message);
          this.loading = false;
        }
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get currentPassword() { return this.changeForm.get('currentPassword'); }
  get newPassword() { return this.changeForm.get('newPassword'); }
  get confirmPassword() { return this.changeForm.get('confirmPassword'); }
  get personalEmail() { return this.changeForm.get('personalEmail'); }
}
