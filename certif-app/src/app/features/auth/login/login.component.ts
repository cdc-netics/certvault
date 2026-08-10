import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AzureSsoCancelledError, AzureSsoService } from '../../../core/services/azure-sso.service';

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
                  <div *ngIf="adLoginEnabled && adProvider === 'azure' && isAzureSsoConfigured()" class="mb-3">
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

  adLoginEnabled = false;
  adProvider: 'ldap' | 'azure' = 'azure';
  useAdLdap = false;
  azureTenantId = '';
  azureClientId = '';

  private azureClientId: string | null = null;
  private azureTenantId: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly settingsService: SettingsService,
    private readonly azureSsoService: AzureSsoService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.getAdConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adLoginEnabled = response.data.adLoginEnabled;
          this.adProvider = response.data.adProvider as 'ldap' | 'azure';
          this.azureTenantId = response.data.azureTenantId || '';
          this.azureClientId = response.data.azureClientId || '';
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

  /**
   * Inicia sesión contra Microsoft Entra ID y entrega al backend el id_token emitido por
   * Microsoft. El backend verifica su firma, por lo que este flujo no otorga confianza por
   * sí mismo: solo transporta la credencial.
   */
  async loginWithAzure(): Promise<void> {
    if (!this.isAzureSsoConfigured()) {
      this.errorMessage = 'El inicio de sesión con Microsoft no está configurado. Contacta al administrador.';
      return;
    }
  }

  private loginWithAzureMsal(clientId: string, tenantId: string): void {
    this.msalService.initialize({ clientId, tenantId })
      .then(() => this.msalService.loginPopup())
      .then((result) => {
        return this.authService.adLogin({ idToken: result.idToken }).toPromise();
      })
      .then((response) => {
        if (response?.success) {
          this.router.navigate(['/dashboard']);
        }
      })
      .catch((error) => {
        if (error?.errorCode === 'user_cancelled') {
          this.errorMessage = '';
        } else {
          this.errorMessage = error?.message || 'Error al autenticar con Microsoft. Intente nuevamente.';
        }
        this.isLoading = false;
      });
  }

    try {
      const idToken = await this.azureSsoService.acquireIdToken({
        tenantId: this.azureTenantId,
        clientId: this.azureClientId
      });

      this.authService.adLogin({ idToken }).subscribe({
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
    } catch (error) {
      this.isLoading = false;
      if (error instanceof AzureSsoCancelledError) {
        return;
      }
      this.errorMessage = 'No pudimos completar el inicio de sesión con Microsoft. Intenta nuevamente.';
      console.error('Error en el flujo SSO de Microsoft:', error);
    }
  }

  /** El botón solo tiene sentido si el App Registration está declarado en el panel de seguridad. */
  isAzureSsoConfigured(): boolean {
    return Boolean(this.azureTenantId && this.azureClientId);
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
