import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CertificationService } from '../../core/services/certification.service';
import { User, Department, UserRole } from '../../core/models/user.model';
import { Certification } from '../../core/models/certification.model';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { SettingsService } from '../../core/services/settings.service';

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
  departmentOptions: any[] = [];
  roleOptions: any[] = [];
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
  downloadingZip = false;
  
  // Control de pestanas
  activeTab: 'profile' | 'password' | 'activity' | 'certifications' = 'profile';
  
  // Actividad reciente
  recentActivity: any[] = [];

  // Certificaciones del usuario
  userCertifications: Certification[] = [];
  isLoadingCertifications = false;
  certificationsError = '';
  selectedCertification: Certification | null = null;
  showDetailsModal = false;
  requirePersonalEmail = true;
  
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly certificationService: CertificationService,
    private readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.buildOptions();
    this.initializeForms();

    this.settingsService.getActiveSmtpPolicy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.requirePersonalEmail = response.data.requirePersonalEmail;
            if (!this.requirePersonalEmail) {
              const personalEmailCtrl = this.profileForm.get('personalEmail');
              personalEmailCtrl?.clearValidators();
              personalEmailCtrl?.setValidators([Validators.email]);
              personalEmailCtrl?.updateValueAndValidity();
            }
          }
        },
        error: (err) => console.error('Error al obtener politicas SMTP:', err)
      });

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
      personalEmail: ['', [Validators.required, Validators.email]],
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
      const deptVal = this.currentUser.department && typeof this.currentUser.department === 'object'
        ? (this.currentUser.department as any)._id
        : this.currentUser.department;
      
      const positionName = typeof this.currentUser.position === 'object' && this.currentUser.position
        ? (this.currentUser.position as any).name || ''
        : this.currentUser.position || '';

      this.profileForm.patchValue({
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        email: this.currentUser.email,
        personalEmail: this.currentUser.personalEmail || '',
        phone: this.currentUser.phone || '',
        position: positionName,
        department: deptVal,
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

  downloadAllCertifications(): void {
    if (!this.currentUser?._id) return;
    this.downloadingZip = true;
    this.certificationsError = '';

    this.certificationService.downloadAllUserCertifications(this.currentUser._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const userSuffix = `${this.currentUser?.firstName || 'usuario'}_${this.currentUser?.lastName || ''}`.replace(/\s+/g, '_');
          link.download = `certificaciones_${userSuffix}.zip`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.downloadingZip = false;
        },
        error: (err) => {
          console.error('Error al descargar ZIP de certificaciones:', err);
          this.certificationsError = err.message || 'Error al descargar el archivo comprimido ZIP';
          this.downloadingZip = false;
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

            // Si el usuario cambia la contraseña y nunca ha firmado los términos, disparar el modal
            const user = this.authService.getCurrentUser();
            if (user && !user.termsAccepted) {
              this.authService.triggerTermsModal();
            }
          }
          this.loadingPassword = false;
        },
        error: (error) => {
          this.passwordError = error.message || 'Error al cambiar la contrasena';
          this.loadingPassword = false;
        }
      });
  }

  setActiveTab(tab: 'profile' | 'password' | 'activity' | 'certifications'): void {
    this.activeTab = tab;
    // Limpiar mensajes al cambiar de pestana
    this.profileError = '';
    this.profileSuccess = '';
    this.passwordError = '';
    this.passwordSuccess = '';
    this.certificationsError = '';

    if (tab === 'certifications') {
      this.loadUserCertifications();
    }
  }

  /**
   * Carga las certificaciones pertenecientes al usuario actual desde el servidor.
   */
  loadUserCertifications(): void {
    if (!this.currentUser?._id) return;
    
    this.isLoadingCertifications = true;
    this.certificationsError = '';
    
    this.certificationService.getUserCertifications(this.currentUser._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.userCertifications = response.data;
          } else {
            this.userCertifications = [];
          }
          this.isLoadingCertifications = false;
        },
        error: (error) => {
          this.certificationsError = error.message || 'Error al cargar las certificaciones';
          this.isLoadingCertifications = false;
        }
      });
  }

  /**
   * Elimina una certificacion previa confirmacion del usuario.
   * @param cert Certificacion a eliminar
   */
  deleteCertification(cert: Certification): void {
    if (!cert._id || !this.canDeleteCertification(cert)) return;
    
    const confirmado = confirm(`¿Está seguro de que desea eliminar la certificación "${cert.title}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    
    this.isLoadingCertifications = true;
    this.certificationService.deleteCertification(cert._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadUserCertifications();
        },
        error: (error) => {
          this.certificationsError = error.message || 'No se pudo eliminar la certificación';
          this.isLoadingCertifications = false;
        }
      });
  }

  /**
   * Determina si el usuario actual tiene permisos para eliminar una certificacion.
   */
  canDeleteCertification(cert: Certification): boolean {
    if (!this.currentUser) return false;
    // El propietario de la certificacion, el administrador y el lider del departamento pueden eliminar
    const esPropietario = cert.employeeId === this.currentUser._id || cert.createdBy === this.currentUser._id;
    const mismoDepartamento = cert.department === this.currentUser.department || 
      (this.currentUser.managedDepartments || []).includes(cert.department as any);
      
    if (this.isAdmin) return true;
    if (this.isLeader && mismoDepartamento) return true;
    
    return esPropietario;
  }

  /**
   * Determina si el usuario actual tiene permisos para editar una certificacion.
   */
  canEditCertification(cert: Certification): boolean {
    if (!this.currentUser) return false;
    // El propietario de la certificacion, el administrador y el lider del departamento pueden editar
    const esPropietario = cert.employeeId === this.currentUser._id || cert.createdBy === this.currentUser._id;
    const mismoDepartamento = cert.department === this.currentUser.department || 
      (this.currentUser.managedDepartments || []).includes(cert.department as any);
      
    if (this.isAdmin) return true;
    if (this.isLeader && mismoDepartamento) return true;
    
    return esPropietario;
  }

  /**
   * Descarga el archivo de certificacion asociado de forma segura.
   */
  downloadCertificate(cert: Certification): void {
    if (!cert._id || !this.isInternalCertificateUrl(cert.certificateUrl)) {
      this.certificationsError = 'La descarga segura solo está disponible para certificados guardados localmente';
      return;
    }

    this.certificationService.getCertificationFile(cert._id, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const urlObj = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = urlObj;
          link.download = this.getDownloadFileName(cert);
          link.click();
          URL.revokeObjectURL(urlObj);
        },
        error: () => {
          this.certificationsError = 'No se pudo descargar el archivo de certificación';
        }
      });
  }

  /**
   * Abre el archivo de certificacion o badge en una nueva pestana del navegador.
   */
  openCertificate(cert: Certification): void {
    if (!cert._id) return;

    if (!this.isInternalCertificateUrl(cert.certificateUrl)) {
      const url = this.getCertificateUrl(cert);
      if (url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener');
        return;
      }
      this.certificationsError = 'El enlace externo no es seguro. Debe utilizar HTTPS.';
      return;
    }

    this.certificationService.getCertificationFile(cert._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const urlObj = URL.createObjectURL(blob);
          window.open(urlObj, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(urlObj), 60000);
        },
        error: () => {
          this.certificationsError = 'No se pudo abrir el archivo de certificación';
        }
      });
  }

  /**
   * Resuelve y limpia la URL del certificado para su correcto acceso.
   */
  getCertificateUrl(cert: Certification): string {
    if (!cert.certificateUrl) return '';
    const rawUrl = cert.certificateUrl.trim();

    if (rawUrl.startsWith('/uploads/')) return rawUrl;

    if (rawUrl.startsWith('http')) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname.startsWith('/uploads/')) {
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        return rawUrl;
      }
      return rawUrl;
    }

    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }

  /**
   * Verifica si la URL pertenece a un archivo local de la plataforma.
   */
  private isInternalCertificateUrl(url?: string): boolean {
    if (!url) return false;
    return this.getCertificateUrl({ certificateUrl: url } as Certification).startsWith('/uploads/certificates/');
  }

  /**
   * Construye un nombre de archivo descriptivo para la descarga del certificado.
   */
  private getDownloadFileName(cert: Certification): string {
    const baseName = cert.certificateNumber || cert.title || 'certificado';
    const extension = cert.certificateUrl?.match(/\.[a-z0-9]+(?:$|\?)/i)?.[0]?.replace('?', '') || '.pdf';
    return `${baseName}${extension}`;
  }

  /**
   * Abre el modal para ver los detalles de una certificacion.
   */
  openCertificationDetails(cert: Certification): void {
    this.selectedCertification = cert;
    this.showDetailsModal = true;
  }

  /**
   * Cierra el modal de detalles de la certificacion.
   */
  closeCertificationDetails(): void {
    this.showDetailsModal = false;
    this.selectedCertification = null;
  }

  /**
   * Devuelve la etiqueta amigable del nivel de la certificacion.
   */
  getLevelLabel(level: string): string {
    switch (level) {
      case 'beginner': return 'Principiante';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzado';
      case 'expert': return 'Experto';
      case 'academic': return 'Académico';
      default: return level;
    }
  }

  /**
   * Devuelve la clase de Bootstrap CSS adecuada para el estado de la certificacion.
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-success';
      case 'expired': return 'bg-danger';
      case 'expiring_soon': return 'bg-warning text-dark';
      case 'pending': return 'bg-info text-dark';
      case 'revoked': return 'bg-secondary';
      default: return 'bg-primary';
    }
  }

  /**
   * Devuelve la etiqueta traducida para el estado de la certificacion.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Activa';
      case 'expired': return 'Expirada';
      case 'expiring_soon': return 'Por Expirar';
      case 'pending': return 'Pendiente';
      case 'revoked': return 'Revocada';
      default: return status;
    }
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
  get personalEmail() { return this.profileForm.get('personalEmail'); }
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

  getPositionLabel(position: any): string {
    if (!position) return '';
    if (typeof position === 'object') {
      return position.name || '';
    }
    return position;
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
    this.userService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.roleOptions = response.data.map(r => ({
              value: r.value,
              label: r.label
            }));
          }
        }
      });

    this.userService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.departmentOptions = response.data.map(d => ({
              value: d.value,
              label: d.label
            }));
          }
        }
      });
  }
}
