import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BackButtonComponent],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light-custom">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <!-- Botón Volver -->
            <div class="mb-3 text-end">
              <app-back-button [customRoute]="'/login'" [label]="'Volver al Login'"></app-back-button>
            </div>
            
            <div class="card shadow-sm-custom">
              <div class="card-body p-4">
                <!-- Logo/Header -->
                <div class="text-center mb-4">
                  <h2 class="text-primary fw-bold">Netics-CertiVault</h2>
                  <p class="text-muted">Registro de Usuario</p>
                </div>

                <!-- Register Form -->
                <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
                  <div class="row">
                    <!-- Nombre -->
                    <div class="col-md-6 mb-3">
                      <label for="firstName" class="form-label">Nombre</label>
                      <input
                        type="text"
                        id="firstName"
                        class="form-control"
                        [class.is-invalid]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched"
                        formControlName="firstName"
                        placeholder="Tu nombre"
                      >
                      <div class="invalid-feedback" *ngIf="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched">
                        <small *ngIf="registerForm.get('firstName')?.errors?.['required']">El nombre es requerido</small>
                      </div>
                    </div>

                    <!-- Apellido -->
                    <div class="col-md-6 mb-3">
                      <label for="lastName" class="form-label">Apellido</label>
                      <input
                        type="text"
                        id="lastName"
                        class="form-control"
                        [class.is-invalid]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched"
                        formControlName="lastName"
                        placeholder="Tu apellido"
                      >
                      <div class="invalid-feedback" *ngIf="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched">
                        <small *ngIf="registerForm.get('lastName')?.errors?.['required']">El apellido es requerido</small>
                      </div>
                    </div>
                  </div>

                  <!-- Username -->
                  <div class="mb-3">
                    <label for="username" class="form-label">Nombre de Usuario</label>
                    <input
                      type="text"
                      id="username"
                      class="form-control"
                      [class.is-invalid]="registerForm.get('username')?.invalid && registerForm.get('username')?.touched"
                      formControlName="username"
                      placeholder="nombre.usuario"
                    >
                    <div class="invalid-feedback" *ngIf="registerForm.get('username')?.invalid && registerForm.get('username')?.touched">
                      <small *ngIf="registerForm.get('username')?.errors?.['required']">El nombre de usuario es requerido</small>
                      <small *ngIf="registerForm.get('username')?.errors?.['minlength']">Debe tener al menos 3 caracteres</small>
                    </div>
                  </div>

                  <!-- Email -->
                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      [class.is-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                      formControlName="email"
                      placeholder="tu.email@empresa.com"
                    >
                    <div class="invalid-feedback" *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                      <small *ngIf="registerForm.get('email')?.errors?.['required']">El email es requerido</small>
                      <small *ngIf="registerForm.get('email')?.errors?.['email']">Formato de email inválido</small>
                    </div>
                  </div>

                  <!-- Password -->
                  <div class="mb-3">
                    <label for="password" class="form-label">Contraseña</label>
                    <input
                      type="password"
                      id="password"
                      class="form-control"
                      [class.is-invalid]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
                      formControlName="password"
                      placeholder="Tu contraseña"
                    >
                    <div class="invalid-feedback" *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                      <small *ngIf="registerForm.get('password')?.errors?.['required']">La contraseña es requerida</small>
                      <small *ngIf="registerForm.get('password')?.errors?.['minlength']">Debe tener al menos 6 caracteres</small>
                    </div>
                  </div>

                  <div class="row">
                    <!-- Departamento -->
                    <div class="col-md-6 mb-3">
                      <label for="department" class="form-label">Departamento</label>
                      <select
                        id="department"
                        class="form-control"
                        [class.is-invalid]="registerForm.get('department')?.invalid && registerForm.get('department')?.touched"
                        formControlName="department"
                      >
                        <option value="">Seleccionar departamento</option>
                        <option value="TI">Tecnología de la Información</option>
                        <option value="RRHH">Recursos Humanos</option>
                        <option value="Ventas">Ventas</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Finanzas">Finanzas</option>
                        <option value="Operaciones">Operaciones</option>
                        <option value="Calidad">Calidad</option>
                      </select>
                      <div class="invalid-feedback" *ngIf="registerForm.get('department')?.invalid && registerForm.get('department')?.touched">
                        <small *ngIf="registerForm.get('department')?.errors?.['required']">El departamento es requerido</small>
                      </div>
                    </div>

                    <!-- Cargo -->
                    <div class="col-md-6 mb-3">
                      <label for="position" class="form-label">Cargo</label>
                      <input
                        type="text"
                        id="position"
                        class="form-control"
                        [class.is-invalid]="registerForm.get('position')?.invalid && registerForm.get('position')?.touched"
                        formControlName="position"
                        placeholder="Tu cargo"
                      >
                      <div class="invalid-feedback" *ngIf="registerForm.get('position')?.invalid && registerForm.get('position')?.touched">
                        <small *ngIf="registerForm.get('position')?.errors?.['required']">El cargo es requerido</small>
                      </div>
                    </div>
                  </div>

                  <!-- Teléfono -->
                  <div class="mb-3">
                    <label for="phone" class="form-label">Teléfono (Opcional)</label>
                    <input
                      type="tel"
                      id="phone"
                      class="form-control"
                      formControlName="phone"
                      placeholder="+1234567890"
                    >
                  </div>

                  <!-- Error Message -->
                  <div class="alert alert-danger" *ngIf="errorMessage">
                    <small>{{ errorMessage }}</small>
                  </div>

                  <!-- Submit Button -->
                  <button
                    type="submit"
                    class="btn btn-primary w-100 mb-3"
                    [disabled]="registerForm.invalid || isLoading"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Registrando...' : 'Registrarse' }}
                  </button>

                  <!-- Login Link -->
                  <div class="text-center">
                    <small class="text-muted">
                      ¿Ya tienes cuenta? 
                      <a routerLink="/login" class="text-primary text-decoration-none">Inicia sesión aquí</a>
                    </small>
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
    
    .form-control:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      phone: ['']
    });
  }

  ngOnInit(): void {
    // Redireccionar si ya está autenticado
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.register(this.registerForm.value).subscribe({
        next: (response) => {
          if (response.success) {
            // Registro exitoso, redireccionar al login
            this.router.navigate(['/login'], {
              queryParams: { message: 'Registro exitoso. Por favor inicia sesión.' }
            });
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al registrar usuario';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      for (const key of Object.keys(this.registerForm.controls)) {
        this.registerForm.get(key)?.markAsTouched();
      }
    }
  }
}