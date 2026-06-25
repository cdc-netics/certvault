import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BackButtonComponent],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light-custom">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="mb-3 text-end">
              <app-back-button [customRoute]="'/login'" [label]="'Volver al Login'"></app-back-button>
            </div>

            <div class="card shadow-sm-custom">
              <div class="card-body p-4">
                <div class="text-center mb-4">
                  <h2 class="text-primary fw-bold">Netics-CertiVault</h2>
                  <p class="text-muted">Registro de Usuario</p>
                </div>

                <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label for="firstName" class="form-label">Nombre</label>
                      <input
                        type="text"
                        id="firstName"
                        class="form-control"
                        formControlName="firstName"
                        [class.is-invalid]="firstName?.invalid && firstName?.touched"
                        placeholder="Tu nombre"
                      />
                      <div class="invalid-feedback" *ngIf="firstName?.invalid && firstName?.touched">
                        <small>El nombre es requerido</small>
                      </div>
                    </div>

                    <div class="col-md-6 mb-3">
                      <label for="lastName" class="form-label">Apellido</label>
                      <input
                        type="text"
                        id="lastName"
                        class="form-control"
                        formControlName="lastName"
                        [class.is-invalid]="lastName?.invalid && lastName?.touched"
                        placeholder="Tu apellido"
                      />
                      <div class="invalid-feedback" *ngIf="lastName?.invalid && lastName?.touched">
                        <small>El apellido es requerido</small>
                      </div>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="username" class="form-label">Nombre de Usuario</label>
                    <input
                      type="text"
                      id="username"
                      class="form-control"
                      formControlName="username"
                      [class.is-invalid]="username?.invalid && username?.touched"
                      placeholder="nombre.usuario"
                    />
                    <div class="invalid-feedback" *ngIf="username?.invalid && username?.touched">
                      <small *ngIf="username?.errors?.['required']">El nombre de usuario es requerido</small>
                      <small *ngIf="username?.errors?.['minlength']">Debe tener al menos 3 caracteres</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      formControlName="email"
                      [class.is-invalid]="email?.invalid && email?.touched"
                      placeholder="tu.email@empresa.com"
                    />
                    <div class="invalid-feedback" *ngIf="email?.invalid && email?.touched">
                      <small *ngIf="email?.errors?.['required']">El email es requerido</small>
                      <small *ngIf="email?.errors?.['email']">Formato de email invalido</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="personalEmail" class="form-label">Correo Personal</label>
                    <input
                      type="email"
                      id="personalEmail"
                      class="form-control"
                      formControlName="personalEmail"
                      [class.is-invalid]="personalEmail?.invalid && personalEmail?.touched"
                      placeholder="tu.email.personal@gmail.com"
                    />
                    <div class="invalid-feedback" *ngIf="personalEmail?.invalid && personalEmail?.touched">
                      <small *ngIf="personalEmail?.errors?.['required']">El correo personal es requerido</small>
                      <small *ngIf="personalEmail?.errors?.['email']">Formato de correo invalido</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="password" class="form-label">Contraseña</label>
                    <input
                      type="password"
                      id="password"
                      class="form-control"
                      formControlName="password"
                      [class.is-invalid]="password?.invalid && password?.touched"
                      placeholder="Tu contraseña"
                    />
                    <div class="invalid-feedback" *ngIf="password?.invalid && password?.touched">
                      <small *ngIf="password?.errors?.['required']" class="d-block">La contraseña es requerida</small>
                      <small *ngIf="password?.errors?.['minlength']" class="d-block">Debe tener al menos 6 caracteres</small>
                      <small *ngIf="password?.errors?.['pattern']" class="d-block">Debe contener al menos una mayúscula, una minúscula y un número</small>
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label for="department" class="form-label">Departamento</label>
                      <select
                        id="department"
                        class="form-select"
                        formControlName="department"
                        [class.is-invalid]="department?.invalid && department?.touched"
                      >
                        <option value="">Seleccionar departamento</option>
                        <option *ngFor="let dept of availableDepartments" [value]="dept.value">
                          {{ dept.label }}
                        </option>
                      </select>
                      <div class="invalid-feedback" *ngIf="department?.invalid && department?.touched">
                        <small>El departamento es requerido</small>
                      </div>

                      <!-- Campo dinámico al seleccionar "Otro" departamento -->
                      <div class="mt-2" *ngIf="showCustomDept">
                        <label for="customDepartment" class="form-label text-info fw-semibold">¿Cuál departamento? <span class="text-danger">*</span></label>
                        <input
                          type="text"
                          class="form-control"
                          id="customDepartment"
                          formControlName="customDepartment"
                          [class.is-invalid]="registerForm.get('customDepartment')?.invalid && registerForm.get('customDepartment')?.touched"
                          placeholder="Nombre del departamento">
                        <div class="invalid-feedback" *ngIf="registerForm.get('customDepartment')?.invalid && registerForm.get('customDepartment')?.touched">
                          <small>El nombre es requerido</small>
                        </div>
                      </div>
                    </div>

                    <div class="col-md-6 mb-3">
                      <label for="position" class="form-label">Cargo</label>
                      <select
                        id="position"
                        class="form-select"
                        formControlName="position"
                        [class.is-invalid]="position?.invalid && position?.touched"
                      >
                        <option value="">Seleccionar cargo</option>
                        <option *ngFor="let pos of availablePositions" [value]="pos.value">
                          {{ pos.label }}
                        </option>
                      </select>
                      <div class="invalid-feedback" *ngIf="position?.invalid && position?.touched">
                        <small>El cargo es requerido</small>
                      </div>

                      <!-- Campo dinámico al seleccionar "Otro" cargo -->
                      <div class="mt-2" *ngIf="showCustomPos">
                        <label for="customPosition" class="form-label text-info fw-semibold">¿Cuál cargo? <span class="text-danger">*</span></label>
                        <input
                          type="text"
                          class="form-control"
                          id="customPosition"
                          formControlName="customPosition"
                          [class.is-invalid]="registerForm.get('customPosition')?.invalid && registerForm.get('customPosition')?.touched"
                          placeholder="Nombre del cargo">
                        <div class="invalid-feedback" *ngIf="registerForm.get('customPosition')?.invalid && registerForm.get('customPosition')?.touched">
                          <small>El cargo es requerido</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="phone" class="form-label">Teléfono (Opcional)</label>
                    <input
                      type="tel"
                      id="phone"
                      class="form-control"
                      formControlName="phone"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div class="alert alert-danger" *ngIf="errorMessage">
                    <small>{{ errorMessage }}</small>
                  </div>
                  <div class="alert alert-success" *ngIf="successMessage">
                    <small>{{ successMessage }}</small>
                  </div>

                  <button
                    type="submit"
                    class="btn btn-primary w-100 mb-3"
                    [disabled]="registerForm.invalid || isLoading || successMessage"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Registrando...' : 'Registrarse' }}
                  </button>

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
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  availableDepartments: any[] = [];
  availablePositions: any[] = [];
  showCustomDept = false;
  showCustomPos = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      personalEmail: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6), 
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      department: ['', Validators.required],
      customDepartment: [''],
      position: ['', Validators.required],
      customPosition: [''],
      phone: ['']
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadDepartments();
    this.loadPositions();

    // Escuchar cambios para mostrar campos condicionales
    this.registerForm.get('department')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.showCustomDept = val === 'OTHER';
        const ctrl = this.registerForm.get('customDepartment');
        if (this.showCustomDept) {
          ctrl?.setValidators([Validators.required, Validators.maxLength(100)]);
        } else {
          ctrl?.clearValidators();
        }
        ctrl?.updateValueAndValidity({ emitEvent: false });
      });

    this.registerForm.get('position')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.showCustomPos = val === 'OTHER';
        const ctrl = this.registerForm.get('customPosition');
        if (this.showCustomPos) {
          ctrl?.setValidators([Validators.required, Validators.maxLength(100)]);
        } else {
          ctrl?.clearValidators();
        }
        ctrl?.updateValueAndValidity({ emitEvent: false });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDepartments(): void {
    this.userService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.availableDepartments = [...response.data, { key: 'OTHER', value: 'OTHER', label: 'Otro (Crear al vuelo)' }];
          }
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
        }
      });
  }

  private loadPositions(): void {
    this.userService.getPositions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const list = response.data.map((p: any) => ({
              key: p._id,
              value: p._id,
              label: p.name
            }));
            this.availablePositions = [...list, { key: 'OTHER', value: 'OTHER', label: 'Otro (Crear al vuelo)' }];
          }
        },
        error: (error) => {
          console.error('Error cargando cargos:', error);
        }
      });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const payload = { ...this.registerForm.value };
      if (payload.department === 'OTHER') {
        payload.department = payload.customDepartment;
      }
      if (payload.position === 'OTHER') {
        payload.position = payload.customPosition;
      }

      delete payload.customDepartment;
      delete payload.customPosition;

      this.authService.register(payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Te enviamos un correo para validar tu cuenta. Revisa tu bandeja y sigue el enlace para activar el acceso.';
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
      this.registerForm.markAllAsTouched();
    }
  }

  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get username() { return this.registerForm.get('username'); }
  get email() { return this.registerForm.get('email'); }
  get personalEmail() { return this.registerForm.get('personalEmail'); }
  get password() { return this.registerForm.get('password'); }
  get department() { return this.registerForm.get('department'); }
  get position() { return this.registerForm.get('position'); }
}
