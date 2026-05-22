import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User, Department, UserRole } from '../../core/models/user.model';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  departmentOptions: { label: string; value: Department }[] = [];
  roleOptions: { label: string; value: UserRole }[] = [];
  avatarPreview: string | null = null;
  avatarError = '';
  avatarFileName = '';
  private avatarChanged = false;
  private readonly maxAvatarSizeBytes = 2 * 1024 * 1024; // 2MB
  roleLockedForSelf = true;
  
  // Estados
  loading = false;
  loadingPassword = false;
  profileSuccess = '';
  profileError = '';
  passwordSuccess = '';
  passwordError = '';
  
  // Control de pestanas
  activeTab: 'profile' | 'password' | 'activity' = 'profile';
  
  // Actividad reciente
  recentActivity: any[] = [];
  
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.buildOptions();
    this.initializeForms();
    this.loadUserData();
    this.loadRecentActivity();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Formulario de perfil
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      position: ['', [Validators.maxLength(100)]],
      department: [{ value: '', disabled: true }, Validators.required],
      role: [{ value: '', disabled: true }, Validators.required],
      avatar: ['']
    });

    // Formulario de contrasena
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  loadUserData(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        email: this.currentUser.email,
        phone: this.currentUser.phone || '',
        position: this.currentUser.position || '',
      department: this.currentUser.department,
      role: this.currentUser.role,
      avatar: this.currentUser.avatar || this.currentUser.avatarUrl || ''
    });
      // Rol bloqueado para todos
      this.roleLockedForSelf = true;
      this.profileForm.get('role')?.disable();

      // Departamento solo editable por admin
      const departmentControl = this.profileForm.get('department');
      if (departmentControl) {
        if (this.isAdmin) {
          departmentControl.enable();
        } else {
          departmentControl.disable();
        }
      }

      // Cargo/posición solo editable por admin o líder
      const positionControl = this.profileForm.get('position');
      if (positionControl) {
        if (this.canEditPosition) {
          positionControl.enable();
        } else {
          positionControl.disable();
        }
      }
      this.avatarPreview = this.currentUser.avatar || this.currentUser.avatarUrl || null;
      this.avatarChanged = false;
      this.avatarError = '';
      this.avatarFileName = '';
    }
  }

  private loadRecentActivity(): void {
    this.authService.getMyActivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentActivity = response.data;
          }
        },
        error: (error) => {
          console.error('Error al cargar la actividad reciente:', error);
          this.recentActivity = [];
        }
      });
  }

  onSubmitProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.loading = true;
    this.profileError = '';
    this.profileSuccess = '';

    const rawForm = this.profileForm.getRawValue();
    if (this.roleLockedForSelf) {
      delete (rawForm as Partial<User>).role;
    }
    const { avatar, ...formData } = rawForm;
    const payload: Partial<User> = {
      ...formData,
      avatar: this.avatarChanged ? avatar || undefined : undefined,
      avatarUrl: this.avatarPreview || undefined
    };

    const request$ = this.currentUser?._id && this.isAdmin
      ? this.userService.updateUser(this.currentUser._id, payload)
      : this.authService.updateProfile(payload);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.profileSuccess = 'Perfil actualizado exitosamente';
            this.authService.setCurrentUser(response.data);
            this.currentUser = response.data;
            this.avatarPreview = response.data.avatarUrl || this.avatarPreview;
            setTimeout(() => this.profileSuccess = '', 5000);
          } else {
            this.profileError = 'No se pudo actualizar el perfil';
          }
          this.loading = false;
        },
        error: (error) => {
          this.profileError = error.message || 'Error al actualizar el perfil';
          this.loading = false;
        }
      });
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.loadingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    const passwordData = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.authService.changePassword(passwordData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.passwordSuccess = 'Contrasena actualizada exitosamente';
            this.passwordForm.reset();
            setTimeout(() => this.passwordSuccess = '', 5000);
          }
          this.loadingPassword = false;
        },
        error: (error) => {
          this.passwordError = error.message || 'Error al cambiar la contrasena';
          this.loadingPassword = false;
        }
      });
  }

  setActiveTab(tab: 'profile' | 'password' | 'activity'): void {
    this.activeTab = tab;
    // Limpiar mensajes al cambiar de pestana
    this.profileError = '';
    this.profileSuccess = '';
    this.passwordError = '';
    this.passwordSuccess = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters para validacion de formulario de perfil
  get firstName() { return this.profileForm.get('firstName'); }
  get lastName() { return this.profileForm.get('lastName'); }
  get email() { return this.profileForm.get('email'); }
  get phone() { return this.profileForm.get('phone'); }
  get position() { return this.profileForm.get('position'); }
  get department() { return this.profileForm.get('department'); }
  get role() { return this.profileForm.get('role'); }

  // Getters para validacion de formulario de contrasena
  get currentPassword() { return this.passwordForm.get('currentPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }

  // Helpers
  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  getDepartmentLabel(department: Department): string {
    return this.userService.getDepartmentLabel(department);
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Hace menos de 1 hora';
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} dia${days > 1 ? 's' : ''}`;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.avatarError = '';

    if (!file.type.startsWith('image/')) {
      this.avatarError = 'Selecciona un archivo de imagen válido.';
      return;
    }

    if (file.size > this.maxAvatarSizeBytes) {
      this.avatarError = 'La imagen supera los 2MB. Elige una imagen más ligera.';
      return;
    }

    this.avatarFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.avatarPreview = base64;
      this.profileForm.patchValue({ avatar: base64 });
      this.avatarChanged = true;
    };
    reader.readAsDataURL(file);
  }

  clearAvatar(): void {
    this.avatarPreview = null;
    this.avatarFileName = '';
    this.avatarError = '';
    this.avatarChanged = true;
    this.profileForm.patchValue({ avatar: '' });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }

  get isLeader(): boolean {
    return this.currentUser?.role === UserRole.LIDER;
  }

  get canEditDepartment(): boolean {
    return this.isAdmin;
  }

  get canEditPosition(): boolean {
    return this.isAdmin || this.isLeader;
  }

  private buildOptions(): void {
    this.departmentOptions = Object.values(Department).map(value => ({
      value,
      label: this.userService.getDepartmentLabel(value)
    }));
    this.roleOptions = Object.values(UserRole).map(value => ({
      value,
      label: this.userService.getRoleLabel(value)
    }));
  }
}
