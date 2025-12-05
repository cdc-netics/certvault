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

                <!-- Logo/Header -->
                <div class="text-center mb-4">
                  <img
                    src="/resources/NETICS-Isotipo.png"
                    
                    alt="Netics isotipo"
                    class="login-logo mb-3"
                  />
                  <h2 class="text-primary fw-bold">CertiVault</h2>
                  <p class="text-muted">Gestión de Certificaciones Empresariales</p>
                </div>

                <!-- Login Form -->
                <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                  <!-- Email -->
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
                      <small *ngIf="loginForm.get('email')?.errors?.['email']">Formato de email inválido</small>
                    </div>
                  </div>

                  <!-- Password -->
                  <div class="mb-3">
                    <label for="password" class="form-label">Contraseña</label>
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

                  <!-- Error Message -->
                  <div class="alert alert-danger" *ngIf="errorMessage">
                    <small>{{ errorMessage }}</small>
                  </div>

                  <!-- Submit Button -->
                  <button
                    type="submit"
                    class="btn btn-primary w-100 mb-3"
                    [disabled]="loginForm.invalid || isLoading"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
                  </button>

                  
                  <div class="small-info"> 
                  <p class="text-muted">Developed By CDC Team with love ❤️</p> 
                  <p class="text-muted">Version 1.6</p> 
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
          this.errorMessage = error.message || 'Error al iniciar sesión';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      for (const key of Object.keys(this.loginForm.controls)) {
        this.loginForm.get(key)?.markAsTouched();
      }
    }
  }
}




