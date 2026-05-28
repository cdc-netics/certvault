import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

import { UserService, DepartmentOption, RoleOption } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole, Department, RegisterRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit, OnDestroy {
  userForm!: FormGroup;
  loading = false;
  isEditMode = false;
  userId: string | null = null;

  availableRoles: RoleOption[] = [];
  availableDepartments: DepartmentOption[] = [];
  targetUserIsAdmin = false;
  canEditDepartmentField = false;
  canEditPositionField = false;
  canEditRoles = false;
  canSetLeader = false;
  canAdminChangePassword = false;

  private readonly destroy$ = new Subject<void>();
  private readonly passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  currentUser: User | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.canAdminChangePassword = this.authService.isAdmin();
    this.updatePermissions();

    this.initializeForm();
    this.applyFieldLocks();
    this.setPasswordValidators();
    this.userForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.userForm.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true }));
    
    // Suscripción para revalidar el correo personal al cambiar el correo corporativo
    this.userForm.get('email')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.userForm.get('personalEmail')?.updateValueAndValidity({ onlySelf: true }));

    this.loadRoles();
    this.loadDepartments();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.setPasswordValidators();
        this.userId = params['id'];
        if (this.userId) {
          this.loadUser(this.userId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updatePermissions(): void {
    if (this.currentUser) {
      const isAdmin = this.authService.isAdmin();
      const isLeader = this.authService.isLeader();
      this.canEditRoles = isAdmin || isLeader;
      this.canSetLeader = isAdmin;
      this.canEditDepartmentField = isAdmin || isLeader;
      this.canEditPositionField = isAdmin || isLeader;
    }
  }

  private applyFieldLocks(targetUser?: User): void {
    const isAdminCurrent = this.authService.isAdmin();
    const isLeaderCurrent = this.authService.isLeader();
    const targetIsAdmin = targetUser?.role === UserRole.ADMIN;
    const sameDepartment = targetUser
      ? targetUser.department === this.currentUser?.department ||
        (this.currentUser?.managedDepartments || []).includes(targetUser.department)
      : true;

    this.targetUserIsAdmin = !!targetIsAdmin;
    const leaderCanManageTarget = isLeaderCurrent && sameDepartment && !targetIsAdmin;

    this.canEditRoles = isAdminCurrent || leaderCanManageTarget;
    this.canEditDepartmentField = isAdminCurrent || leaderCanManageTarget;
    this.canEditPositionField = isAdminCurrent || leaderCanManageTarget;
    this.canSetLeader = isAdminCurrent;

    this.updateControlState('department', this.canEditDepartmentField);
    this.updateControlState('position', this.canEditPositionField);
    this.updateControlState('role', this.canEditRoles && !this.targetUserIsAdmin);
    this.updateControlState('departmentLeader', this.canSetLeader && !this.targetUserIsAdmin);
    this.updateControlState('managedDepartments', this.canSetLeader && !this.targetUserIsAdmin);
  }

  private updateControlState(controlName: string, enabled: boolean): void {
    const control = this.userForm?.get(controlName);
    if (!control) return;
    if (enabled) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      personalEmail: ['', [Validators.required, Validators.email, this.emailsDifferentValidator.bind(this)]],
      password: [''],
      confirmPassword: [''],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      role: [UserRole.READER, Validators.required],
      department: ['', Validators.required],
      position: ['', [Validators.required, Validators.maxLength(100)]],
      phone: [''],
      isActive: [true],
      departmentLeader: [false],
      managedDepartments: [[]],
      permissions: [[]]
    });

    this.userForm.get('confirmPassword')?.setValidators([
      this.confirmPasswordValidator.bind(this)
    ]);
  }

  private setPasswordValidators(): void {
    const passwordControl = this.userForm.get('password');
    if (!passwordControl) return;

    const validators = this.isEditMode
      ? [Validators.minLength(6), Validators.pattern(this.passwordComplexityRegex)]
      : [Validators.required, Validators.minLength(6), Validators.pattern(this.passwordComplexityRegex)];

    passwordControl.setValidators(validators);
    passwordControl.updateValueAndValidity({ emitEvent: false });
    this.userForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
  }

  private confirmPasswordValidator(control: any) {
    const password = this.userForm?.get('password')?.value;
    const confirmPassword = control.value;
    if (!password && !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Validador que comprueba que el email corporativo y el email personal no sean iguales.
   * Retorna un error 'emailsIdentical' si coinciden.
   */
  private emailsDifferentValidator(control: any) {
    if (!this.userForm) return null;
    const email = this.userForm.get('email')?.value;
    const personalEmail = control.value;
    if (!email || !personalEmail) {
      return null;
    }
    return email.toLowerCase() !== personalEmail.toLowerCase() ? null : { emailsIdentical: true };
  }

  private loadUser(id: string): void {
    this.loading = true;

    this.userService.getUserById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const target = response.data;
            this.targetUserIsAdmin = target.role === UserRole.ADMIN;
            this.userForm.patchValue({
              username: target.username,
              email: target.email,
              personalEmail: target.personalEmail,
              firstName: target.firstName,
              lastName: target.lastName,
              role: target.role,
              department: target.department,
              position: target.position,
              phone: target.phone || '',
              isActive: target.isActive,
              departmentLeader: target.departmentLeader || false,
              managedDepartments: target.managedDepartments || [],
              permissions: target.permissions || []
            });

            this.applyFieldLocks(target);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando usuario:', error);
          this.loading = false;
          alert('Error al cargar el usuario: ' + error.message);
        }
      });
  }

  private loadRoles(): void {
    this.userService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const filtered = response.data.filter(r => r.value !== (UserRole as any).USER);
            if (this.currentUser?.role === UserRole.LIDER) {
              const allowed = [UserRole.READER, UserRole.TECNICO];
              this.availableRoles = filtered.filter(r => allowed.includes(r.value));
            } else {
              this.availableRoles = filtered;
            }
          }
        },
        error: (error) => {
          console.error('Error cargando roles:', error);
        }
      });
  }

  private loadDepartments(): void {
    this.userService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            if (this.currentUser?.role === UserRole.LIDER) {
              const allowed = [
                this.currentUser.department,
                ...(this.currentUser.managedDepartments || [])
              ];
              this.availableDepartments = response.data.filter(d => allowed.includes(d.value));
            } else {
              this.availableDepartments = response.data;
            }
          }
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
        }
      });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formData = this.userForm.value;

    delete (formData as any).confirmPassword;

    if (this.isEditMode && this.userId) {
      if (!formData.password) {
        delete (formData as any).password;
      }

      this.userService.updateUser(this.userId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/users']);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error actualizando usuario:', error);
            alert('Error al actualizar el usuario: ' + error.message);
            this.loading = false;
          }
        });
    } else {
      const createRequest: RegisterRequest = formData as RegisterRequest;

      this.userService.createUser(createRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/users']);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creando usuario:', error);
            alert('Error al crear el usuario: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  private markFormGroupTouched(): void {
    for (const key of Object.keys(this.userForm.controls)) {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    }
  }

  get username() { return this.userForm.get('username'); }
  get email() { return this.userForm.get('email'); }
  get personalEmail() { return this.userForm.get('personalEmail'); }
  get password() { return this.userForm.get('password'); }
  get confirmPassword() { return this.userForm.get('confirmPassword'); }
  get firstName() { return this.userForm.get('firstName'); }
  get lastName() { return this.userForm.get('lastName'); }
  get role() { return this.userForm.get('role'); }
  get department() { return this.userForm.get('department'); }
  get position() { return this.userForm.get('position'); }
  get phone() { return this.userForm.get('phone'); }

  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  getDepartmentLabel(department: Department): string {
    return this.userService.getDepartmentLabel(department);
  }

  onRoleChange(): void {
    const selectedRole = this.userForm.get('role')?.value;

    if (![UserRole.ADMIN, UserRole.LIDER].includes(selectedRole)) {
      this.userForm.get('departmentLeader')?.setValue(false);
      this.userForm.get('managedDepartments')?.setValue([]);
    }
  }

  canSelectRole(role: UserRole): boolean {
    if (this.targetUserIsAdmin) return false;
    if (!this.canEditRoles) return false;
    if (this.currentUser?.role === UserRole.LIDER) {
      return ![UserRole.ADMIN, UserRole.LIDER].includes(role);
    }
    return true;
  }

  shouldShowLeaderOptions(): boolean {
    const selectedRole = this.userForm.get('role')?.value;
    return this.canSetLeader && selectedRole === UserRole.LIDER;
  }

  cancel(): void {
    this.router.navigate(['/users']);
  }
}
