import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
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
                  <h3 class="mt-2 mb-1 fw-bold text-primary">Restablecer contraseña</h3>
                  <p class="text-muted mb-0">Ingresa tu email y te enviaremos un enlace seguro.</p>
                </div>

                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                  <div class="mb-3">
                    <label class="form-label" for="email">Email corporativo</label>
                    <input
                      id="email"
                      type="email"
                      class="form-control"
                      formControlName="email"
                      [class.is-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
                      placeholder="tu.email@empresa.com"
                    />
                    <div class="invalid-feedback" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
                      <small *ngIf="form.get('email')?.errors?.['required']">El email es obligatorio</small>
                      <small *ngIf="form.get('email')?.errors?.['email']">Formato de email invalido</small>
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
                    {{ isLoading ? 'Enviando enlace...' : 'Enviar enlace de restablecimiento' }}
                  </button>
                </form>

                <div class="mt-4 small text-muted">
                  Este proceso no cambia tu contraseña automaticamente. Necesitaras seguir el enlace enviado a tu correo.
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
export class ForgotPasswordComponent {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.form.value.email;
    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage =
            response.message || 'Si el correo esta registrado, enviaremos un enlace en pocos minutos.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'No pudimos enviar el enlace. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }
}
