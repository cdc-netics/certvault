import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center" [style.background]="getBackgroundStyle()">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm-custom border-0 rounded-3">
              <div class="card-body p-4">
                <div class="text-center mb-4">
                  <img
                    [src]="loginLogo"
                    alt="Logo"
                    class="login-logo mb-3"
                  />
                  <h2 class="text-primary fw-bold mb-1">{{ appName }}</h2>
                  <p class="text-muted small">Gestión de Certificaciones Profesionales</p>
                </div>

                <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                  <!-- Email -->
                  <div class="mb-3">
                    <label for="email" class="form-label fw-semibold">Correo Electrónico</label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      [class.is-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                      formControlName="email"
                      placeholder="nombre.apellido@empresa.com"
                    >
                    <div class="invalid-feedback" *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
                      <small *ngIf="loginForm.get('email')?.errors?.['required']">El email es requerido</small>
                      <small *ngIf="loginForm.get('email')?.errors?.['email']">Formato de email inválido</small>
                    </div>
                  </div>

                  <!-- Contraseña -->
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="password" class="form-label fw-semibold mb-0">Contraseña</label>
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

                  <!-- Checkbox LDAP -->
                  <div class="form-check mb-3" *ngIf="adLoginEnabled && adProvider === 'ldap'">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="useLdap" 
                      [checked]="useAdLdap" 
                      (change)="toggleUseLdap()"
                      style="cursor: pointer;">
                    <label class="form-check-label small text-muted" for="useLdap" style="cursor: pointer;">
                      Usar credenciales corporativas (LDAP)
                    </label>
                  </div>

                  <!-- Mensaje de Error -->
                  <div
                    class="alert alert-warning soft-alert d-flex align-items-start gap-2 mb-3"
                    role="alert"
                    *ngIf="errorMessage"
                  >
                    <div>
                      <div class="fw-semibold">No pudimos iniciar sesión</div>
                      <div class="small text-muted">{{ errorMessage }}</div>
                    </div>
                  </div>

                  <!-- Botón Principal -->
                  <button
                    type="submit"
                    class="btn btn-primary w-100 mb-3 py-2 fw-semibold shadow-sm"
                    [disabled]="loginForm.invalid || isLoading"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
                  </button>

                  <!-- Botón de SSO con Azure AD (Microsoft) -->
                  <div *ngIf="adLoginEnabled && adProvider === 'azure'" class="mb-3">
                    <div class="position-relative d-flex align-items-center justify-content-center my-3">
                      <hr class="w-100 text-muted">
                      <span class="position-absolute bg-white px-2 text-muted small">o ingresar con</span>
                    </div>
                    <button
                      type="button"
                      class="btn btn-outline-dark w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      (click)="loginWithAzure()"
                      [disabled]="isLoading"
                    >
                      <i class="fab fa-microsoft text-primary fs-5"></i>
                      Cuenta Corporativa Microsoft
                    </button>
                  </div>

                  <div class="small-info text-center mt-3">
                    <p class="text-muted mb-0">Versión {{ appVersion }}</p>
                    <p class="mb-0 mt-2">
                      <small class="text-muted">¿Aún no tienes cuenta? <a routerLink="/register" class="text-primary text-decoration-none">Regístrate</a></small>
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
      width: 80px;
      max-width: 40%;
      height: auto;
    }
    .small-info {
      font-size: 0.85rem;
      line-height: 1.2;
    }
    .form-control:focus {
      border-color: #00C3B4;
      box-shadow: 0 0 0 0.2rem rgba(0, 195, 180, 0.25);
    }
    .soft-alert {
      background: #fff7e6;
      border: 1px solid #ffe0b3;
      border-radius: 12px;
    }
  `]
})
export class LoginComponent implements OnInit {
  // Versión actual del aplicativo desplegado en producción
  appVersion = '2.2.1-beta';

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  // Configuración de Active Directory
  adLoginEnabled = false;
  adProvider: 'ldap' | 'azure' = 'azure';
  useAdLdap = false;

  // Propiedades de branding dinámico
  loginLogo = '/resources/NETICS-Isotipo.png';
  appName = 'CertiVault';
  primaryColor = '#00C3B4';
  secondaryColor = '#008f86';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly settingsService: SettingsService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Suscribirse a los cambios del branding dinámico
    this.settingsService.branding$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branding) => {
        if (branding) {
          this.loginLogo = branding.loginLogo || '/resources/NETICS-Isotipo.png';
          this.appName = branding.appName || 'CertiVault';
          this.primaryColor = branding.primaryColor || '#00C3B4';
          this.secondaryColor = branding.secondaryColor || '#008f86';
        }
      });

    // Cargar y aplicar configuración de branding
    this.settingsService.loadAndApplyBranding().subscribe({
      error: (err) => console.error('Error al cargar la configuración de branding en Login:', err)
    });

    // Carga inicial de la configuración de AD/SSO para renderizar las opciones de login
    this.authService.getAdConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adLoginEnabled = response.data.adLoginEnabled;
          this.adProvider = response.data.adProvider as 'ldap' | 'azure';
        }
      },
      error: (err) => {
        console.error('Error cargando configuración de AD SSO:', err);
      }
    });
  }

  toggleUseLdap(): void {
    this.useAdLdap = !this.useAdLdap;
  }

  loginWithAzure(): void {
    // Simulación de redirección de inicio de sesión único con Microsoft Azure AD (Entra ID)
    const mockEmail = prompt('Simulación de Microsoft SSO. Ingrese su correo corporativo para iniciar sesión:');
    if (!mockEmail || !mockEmail.trim()) {
      return;
    }

    const emailTrimmed = mockEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      alert('Formato de correo electrónico no válido.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // En producción se enviaría el idToken real provisto por MSAL
    const mockPayload = {
      idToken: `mock-jwt-azure-sso-token-for-${emailTrimmed}`
    };

    // Simulamos la verificación del token en el backend
    // Pasamos los claims necesarios encriptados o estructurados en la firma
    const tokenObj = {
      tid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', // Mismo UUID simulado en el backend
      email: emailTrimmed,
      name: emailTrimmed.split('@')[0].replace('.', ' '),
      given_name: emailTrimmed.split('@')[0],
      family_name: 'AD User',
      department: 'Ciberseguridad',
      jobTitle: 'Especialista'
    };

    // Firmar simulación codificando en Base64
    const simulatedToken = btoa(JSON.stringify(tokenObj));

    this.authService.adLogin({ idToken: simulatedToken }).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error en autenticación corporativa con Azure AD';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginObservable = this.useAdLdap 
        ? this.authService.adLogin(this.loginForm.value)
        : this.authService.login(this.loginForm.value);

      loginObservable.subscribe({
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
      for (const key of Object.keys(this.loginForm.controls)) {
        this.loginForm.get(key)?.markAsTouched();
      }
    }
  }

  getBackgroundStyle(): string {
    return `linear-gradient(135deg, ${this.primaryColor} 0%, ${this.secondaryColor} 100%)`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
