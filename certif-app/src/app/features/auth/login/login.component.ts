import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light-custom">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm-custom">
              <div class="card-body p-4">
                <div class="text-center mb-4">
                  <img
                    src="/resources/NETICS-Isotipo.png"
                    alt="Netics isotipo"
                    class="login-logo mb-3"
                  />
                  <h2 class="text-primary fw-bold">CertiVault</h2>
                  <p class="text-muted">Gestion de Certificaciones Empresariales</p>
                </div>

                <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      [class.is-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                      formControlName="email"
                      placeholder="tu.email@empresa.com"
                    >
                    <div class="invalid-feedback" *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
                      <small *ngIf="loginForm.get('email')?.errors?.['required']">El email es requerido</small>
                      <small *ngIf="loginForm.get('email')?.errors?.['email']">Formato de email invalido</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="password" class="form-label mb-0">Contraseña</label>
                      <a class="small text-primary text-decoration-none" routerLink="/forgot-password">
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                    <input
                      type="password"
                      id="password"
                      class="form-control"
                      [class.is-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                      formControlName="password"
                      placeholder="Tu contraseña"
                    >
                    <div class="invalid-feedback" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                      <small *ngIf="loginForm.get('password')?.errors?.['required']">La contraseña es requerida</small>
                    </div>
                  </div>

                  <div
                    class="alert alert-warning soft-alert d-flex align-items-start gap-2"
                    role="alert"
                    *ngIf="errorMessage"
                  >
                    
                    <div>
                      <div class="fw-semibold">No pudimos iniciar sesion</div>
                      <div class="small text-muted">{{ errorMessage }}</div>
                      <div class="small text-muted mt-1">
                        Si el problema continua, intenta restablecer tu contraseña o contacta al administrador.
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    class="btn btn-primary w-100 mb-3"
                    [disabled]="loginForm.invalid || isLoading"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Iniciando sesion...' : 'Iniciar Sesion' }}
                  </button>

                  <div class="small-info text-center">
                    <p class="text-muted mb-0">Version 1.8-beta</p>
                    <p class="mb-0 mt-2">
                      <small class="text-muted">¿Aun no tienes cuenta? <a routerLink="/register" class="text-primary text-decoration-none">Regístrate</a></small>
                    </p>

                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-light-custom {
      background: linear-gradient(135deg, #00C3B4 0%, #008f86 100%);
    }
    .card {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
    }
    .login-logo {
      width: 96px;
      max-width: 40%;
      height: auto;
    }
    .small-info {
      font-size: 0.85rem;
      line-height: 1.2;
      margin-top: 1rem;
      text-align: center;
    }
    .form-control:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
    }
    .soft-alert {
      background: #fff7e6;
      border: 1px solid #ffe0b3;
      border-radius: 12px;
    }
    .alert-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #f59e0b;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      margin-top: 2px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al iniciar sesion';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      for (const key of Object.keys(this.loginForm.controls)) {
        this.loginForm.get(key)?.markAsTouched();
      }
    }
  }
}
