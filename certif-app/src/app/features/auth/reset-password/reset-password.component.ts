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

                <form [formGroup]="form" (ngSubmit)="onSubmit()">
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

                  <div class="alert alert-success soft-success" *ngIf="successMessage">
                    {{ successMessage }}
                  </div>
                  <div class="alert alert-warning soft-alert d-flex gap-2" *ngIf="errorMessage">
                    <div class="alert-icon">!</div>
                    <div>{{ errorMessage }}</div>
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
      }
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

    this.authService
      .resetPassword({ token: this.token, newPassword: this.form.value.password, email: this.email })
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

  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) {
      return null;
    }
    return password === confirm ? null : { mismatch: true };
  }
}
