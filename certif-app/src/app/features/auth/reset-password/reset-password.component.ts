import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light-custom">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-7 col-lg-5">
            <div class="card shadow-sm-custom">
              <div class="card-body p-4">
                <div class="mb-4">
                  <a routerLink="/login" class="text-decoration-none text-primary small">
                    ← Volver al inicio de sesion
                  </a>
                  <h3 class="mt-2 mb-1 fw-bold text-primary">Crear nueva contraseña</h3>
                  <p class="text-muted mb-0">Define una contraseña segura para tu cuenta.</p>
                </div>

                <!-- Mensajes de alerta generales para éxito o error -->
                <div class="alert alert-success soft-success" *ngIf="successMessage">
                  {{ successMessage }}
                </div>
                <div class="alert alert-warning soft-alert d-flex gap-2" *ngIf="errorMessage">
                  <div class="alert-icon">!</div>
                  <div>{{ errorMessage }}</div>
                </div>

                <!-- Indicador visual mientras se valida el enlace de recuperación -->
                <div *ngIf="isVerifyingToken" class="text-center py-4">
                  <span class="spinner-border spinner-border-sm me-2 text-primary" role="status"></span>
                  <span class="text-muted">Verificando enlace...</span>
                </div>

                <!-- Formulario habilitado únicamente si el enlace es válido -->
                <form *ngIf="!isVerifyingToken && isValidToken" [formGroup]="form" (ngSubmit)="onSubmit()">
                  <!-- Campo condicional para registrar el correo personal si el backend lo requiere -->
                  <div class="mb-3" *ngIf="requiresPersonalEmail">
                    <label class="form-label" for="personalEmail">Correo personal de respaldo</label>
                    <input
                      id="personalEmail"
                      type="email"
                      class="form-control"
                      formControlName="personalEmail"
                      [class.is-invalid]="form.get('personalEmail')?.invalid && form.get('personalEmail')?.touched"
                      placeholder="correo_personal@ejemplo.com"
                    />
                    <div class="invalid-feedback" *ngIf="form.get('personalEmail')?.invalid && form.get('personalEmail')?.touched">
                      <small *ngIf="form.get('personalEmail')?.errors?.['required']" class="d-block">El correo personal es obligatorio.</small>
                      <small *ngIf="form.get('personalEmail')?.errors?.['email']" class="d-block">Ingrese un correo electrónico válido.</small>
                      <small *ngIf="form.get('personalEmail')?.errors?.['emailsIdentical']" class="d-block">El correo personal no puede ser igual al de la empresa.</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label" for="password">Nueva contraseña</label>
                    <input
                      id="password"
                      type="password"
                      class="form-control"
                      formControlName="password"
                      [class.is-invalid]="form.get('password')?.invalid && form.get('password')?.touched"
                      placeholder="Minimo 6 caracteres"
                    />
                    <div class="invalid-feedback" *ngIf="form.get('password')?.invalid && form.get('password')?.touched">
                      <small *ngIf="form.get('password')?.errors?.['required']">La contraseña es obligatoria</small>
                      <small *ngIf="form.get('password')?.errors?.['minlength']">Minimo 6 caracteres</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label" for="confirmPassword">Confirmar contraseña</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      class="form-control"
                      formControlName="confirmPassword"
                      [class.is-invalid]="form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.touched"
                      placeholder="Repite tu contraseña"
                    />
                    <div class="invalid-feedback" *ngIf="form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.touched">
                      <small *ngIf="form.get('confirmPassword')?.errors?.['required']">Confirma la contraseña</small>
                      <small *ngIf="form.errors?.['mismatch']">Las contraseñas no coinciden</small>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary w-100" [disabled]="form.invalid || isLoading">
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Actualizando...' : 'Guardar nueva contraseña' }}
                  </button>
                </form>

                <div class="mt-4 small text-muted">
                  Este enlace caduca tras unos minutos por seguridad. Si vence, solicita uno nuevo desde el inicio de sesion.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-light-custom { background: linear-gradient(135deg, #00C3B4 0%, #008f86 100%); }
    .card { backdrop-filter: blur(10px); background: rgba(255,255,255,0.97); }
    .soft-alert { background: #fff7e6; border: 1px solid #ffe0b3; border-radius: 12px; }
    .soft-success { background: #ecfdf3; border: 1px solid #bbf7d0; border-radius: 12px; }
    .alert-icon {
      width: 20px; height: 20px; border-radius: 50%; background: #f59e0b; color: #fff;
      display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-top: 2px;
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  form: FormGroup;
  token = '';
  email = '';
  isLoading = false;
  isVerifyingToken = true;
  isValidToken = false;
  requiresPersonalEmail = false;
  successMessage = '';
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: [this.passwordsMatchValidator.bind(this)] }
    );
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.token = params.get('token') || '';
      this.email = params.get('email') || '';

      if (!this.token) {
        this.errorMessage = 'El enlace no es valido o falta el token.';
        this.isVerifyingToken = false;
        this.isValidToken = false;
        return;
      }

      // Valida la vigencia y firma del token de restablecimiento antes de permitir la edición.
      this.authService
        .verifyResetToken({ token: this.token, email: this.email })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isVerifyingToken = false;
            if (response.success && response.data) {
              this.isValidToken = true;
              this.requiresPersonalEmail = response.data.requiresPersonalEmail;
              
              if (this.requiresPersonalEmail) {
                // Incorpora dinámicamente el control y validaciones del correo personal.
                this.form.addControl(
                  'personalEmail',
                  this.fb.control('', [
                    Validators.required,
                    Validators.email,
                    this.emailsDifferentValidator.bind(this)
                  ])
                );
              }
            } else {
              this.isValidToken = false;
              this.errorMessage = 'El enlace de restablecimiento es inválido o ya expiró.';
            }
          },
          error: (error) => {
            this.isVerifyingToken = false;
            this.isValidToken = false;
            this.errorMessage = error.message || 'El enlace de restablecimiento es inválido o ya expiró.';
          }
        });
    });

    this.form.get('confirmPassword')?.setValidators([Validators.required]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: { token: string; newPassword: string; email?: string; personalEmail?: string } = {
      token: this.token,
      newPassword: this.form.value.password,
      email: this.email
    };

    // Adjuntar el correo personal si es requerido por el flujo actual.
    if (this.requiresPersonalEmail) {
      payload.personalEmail = this.form.value.personalEmail;
    }

    this.authService
      .resetPassword(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message || 'Contraseña actualizada. Ya puedes iniciar sesion.';
            setTimeout(() => this.router.navigate(['/login']), 2000);
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message || 'No pudimos actualizar la contraseña.';
          this.isLoading = false;
        }
      });
  }

  // Validador personalizado para asegurar que el correo personal no coincida con el corporativo.
  private emailsDifferentValidator(control: any) {
    if (!this.email) return null;
    const corpEmail = this.email.toLowerCase().trim();
    const personal = (control.value || '').toLowerCase().trim();
    if (!corpEmail || !personal) {
      return null;
    }
    return corpEmail !== personal ? null : { emailsIdentical: true };
  }

  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) {
      return null;
    }
    return password === confirm ? null : { mismatch: true };
  }
}
