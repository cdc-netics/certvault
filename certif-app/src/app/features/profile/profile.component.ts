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
  
  // Estados
  loading = false;
  loadingPassword = false;
  profileSuccess = '';
  profileError = '';
  passwordSuccess = '';
  passwordError = '';
  
  // Control de pestañas
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
      position: ['', [Validators.maxLength(100)]]
    });

    // Formulario de contraseña
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
        position: this.currentUser.position || ''
      });
    }
  }

  private loadRecentActivity(): void {
    // Datos de ejemplo - en producción vendría del backend
    this.recentActivity = [
      {
        action: 'Inicio de sesión',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        ip: '192.168.1.100',
        device: 'Chrome - Windows'
      },
      {
        action: 'Actualización de perfil',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        ip: '192.168.1.100',
        device: 'Chrome - Windows'
      },
      {
        action: 'Inicio de sesión',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        ip: '192.168.1.105',
        device: 'Firefox - Windows'
      }
    ];
  }

  onSubmitProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.loading = true;
    this.profileError = '';
    this.profileSuccess = '';

    const updateData = this.profileForm.value;

    this.authService.updateProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.profileSuccess = 'Perfil actualizado exitosamente';
            // Actualizar usuario en el servicio de autenticación
            if (response.data) {
              localStorage.setItem('user', JSON.stringify(response.data));
              this.currentUser = response.data;
            }
            setTimeout(() => this.profileSuccess = '', 5000);
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
            this.passwordSuccess = 'Contraseña actualizada exitosamente';
            this.passwordForm.reset();
            setTimeout(() => this.passwordSuccess = '', 5000);
          }
          this.loadingPassword = false;
        },
        error: (error) => {
          this.passwordError = error.message || 'Error al cambiar la contraseña';
          this.loadingPassword = false;
        }
      });
  }

  setActiveTab(tab: 'profile' | 'password' | 'activity'): void {
    this.activeTab = tab;
    // Limpiar mensajes al cambiar de pestaña
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

  // Getters para validación de formulario de perfil
  get firstName() { return this.profileForm.get('firstName'); }
  get lastName() { return this.profileForm.get('lastName'); }
  get email() { return this.profileForm.get('email'); }
  get phone() { return this.profileForm.get('phone'); }
  get position() { return this.profileForm.get('position'); }

  // Getters para validación de formulario de contraseña
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
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }
}