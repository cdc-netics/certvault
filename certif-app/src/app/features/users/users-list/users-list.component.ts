import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

import { UserService, UsersQuery, UserStats } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole, Department } from '../../../core/models/user.model';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit, OnDestroy {
  selectedUser: User | null = null;
  showUserModal = false;
  showBulkDeptModal = false;
  bulkDepartmentId = '';
  users: User[] = [];
  loading = false;
  errorMessage = '';
  selectedUserIds: string[] = [];
  stats: UserStats | null = null;
  
  pagination = {
    currentPage: 1,
    totalPages: 0,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  };

  filters: UsersQuery = {
    page: 1,
    limit: 10,
    search: '',
    role: undefined,
    department: undefined,
    isActive: undefined,
    departmentLeader: undefined
  };

  availableRoles: any[] = [];
  availableDepartments: any[] = [];

  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  
  currentUser: User | null = null;
  canCreateUsers = false;
  canEditUsers = false;
  canDeleteUsers = false;
  // Determina si el sistema debe notificar el envío de respaldo ZIP según la configuración del servidor
  sendBackupOnDelete = true;

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.updatePermissions();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filters.page = 1;
      this.loadUsers();
    });

    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loadRoles();
    this.loadDepartments();
    this.loadStats();
    this.loadUsers();
    this.loadServerPolicy();
  }

  // Consulta al backend la política global SMTP para saber si está activado el envío de ZIP
  private loadServerPolicy(): void {
    this.settingsService.getServerPolicy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.sendBackupOnDelete = response.data.sendBackupOnDelete !== false;
          }
        },
        error: (error) => {
          console.error('Error al cargar la política del servidor:', error);
        }
      });
  }

  private updatePermissions(): void {
    if (this.currentUser) {
      this.canCreateUsers = this.authService.canCreateUsers();
      this.canEditUsers = this.authService.canViewUsers();
      this.canDeleteUsers = this.authService.canManageUsers();
    }
  }

  loadUsers(): void {
    this.loading = true;
    
    this.userService.getUsers(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data.users;
            this.pagination = response.data.pagination;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando usuarios:', error);
          this.errorMessage = error.message || 'Error al cargar usuarios';
          this.loading = false;
        }
      });
  }

  private loadStats(): void {
    this.userService.getUserStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          }
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
        }
      });
  }

  private loadRoles(): void {
    this.userService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.availableRoles = response.data;
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
            this.availableDepartments = response.data;
          }
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
        }
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.filters.search || '');
  }

  clearFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      search: '',
      role: undefined,
      department: undefined,
      isActive: undefined,
      departmentLeader: undefined
    };
    this.loadUsers();
  }

  refreshUsers(): void {
    this.loadInitialData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadUsers();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.pagination.currentPage - 2);
    const end = Math.min(this.pagination.totalPages, this.pagination.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  trackByUserId(index: number, user: User): string {
    return user._id || index.toString();
  }

  // Permisos
  canEditUser(user: User): boolean {
    if (!this.canEditUsers || !this.currentUser) return false;
    if (user._id === this.currentUser._id) return false;
    if (this.currentUser.role === UserRole.LIDER) {
      return this.userService.canManageDepartment(this.currentUser, user.department);
    }
    return this.currentUser.role === UserRole.ADMIN;
  }

  canDeleteUser(user: User): boolean {
    if (!this.canDeleteUsers || !this.currentUser) return false;
    if (user._id === this.currentUser._id) return false;
    if (this.currentUser.role === UserRole.LIDER) {
      const canManageDept = this.userService.canManageDepartment(this.currentUser, user.department);
      const canDeleteRole = ![UserRole.ADMIN, UserRole.LIDER].includes(user.role);
      return canManageDept && canDeleteRole;
    }
    return this.currentUser.role === UserRole.ADMIN;
  }

  // Acciones
  viewUser(user: User): void {
    this.selectedUser = user;
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  deleteUser(user: User): void {
    if (!this.canDeleteUser(user)) return;
    
    // El texto del confirm se genera dinámicamente según el estado de la política sendBackupOnDelete del servidor
    const confirmMessage = this.sendBackupOnDelete
      ? `¿Estás seguro de que deseas eliminar al usuario ${user.firstName} ${user.lastName}? Esta acción enviará un respaldo con sus certificados a su correo personal y los borrará de forma permanente.`
      : `¿Estás seguro de que deseas eliminar al usuario ${user.firstName} ${user.lastName}? Esta acción borrará al usuario y sus certificados de forma permanente.`;

    if (!confirm(confirmMessage)) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.userService.deleteUser(user._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUsers();
            this.loadStats();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error eliminando usuario:', error);
          this.errorMessage = error.message || 'No se pudo eliminar el usuario';
          this.loading = false;
        }
      });
  }

  // Verifica si un usuario específico está seleccionado en la lista
  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.includes(userId);
  }

  // Alterna la selección de un usuario individual, ignorando al propio administrador
  toggleSelectUser(userId: string): void {
    if (userId === this.currentUser?._id) return;
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  // Alterna la selección de todos los usuarios de la vista actual (excluyendo al administrador actual)
  toggleSelectAll(event: any): void {
    const isChecked = event.target.checked;
    if (isChecked) {
      const selectableIds = this.users
        .map(u => u._id)
        .filter((id): id is string => !!id && id !== this.currentUser?._id);
      
      selectableIds.forEach(id => {
        if (!this.selectedUserIds.includes(id)) {
          this.selectedUserIds.push(id);
        }
      });
    } else {
      const pageIds = this.users.map(u => u._id).filter(Boolean);
      this.selectedUserIds = this.selectedUserIds.filter(id => !pageIds.includes(id));
    }
  }

  // Comprueba si todos los usuarios elegibles de la página actual están seleccionados
  areAllUsersSelected(): boolean {
    const selectableUsers = this.users.filter(u => u._id !== this.currentUser?._id);
    if (selectableUsers.length === 0) return false;
    return selectableUsers.every(u => this.selectedUserIds.includes(u._id!));
  }

  // Envía la petición masiva para forzar el cambio de clave en el próximo inicio de sesión
  forcePasswordChangeBulk(): void {
    if (this.selectedUserIds.length === 0) return;

    if (!confirm(`¿Estás seguro de que deseas forzar el cambio de contraseña para los ${this.selectedUserIds.length} usuarios seleccionados? Deberán cambiar su clave en su próximo inicio de sesión.`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.userService.forcePasswordChange(this.selectedUserIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Se ha forzado el cambio de contraseña para los usuarios seleccionados correctamente.');
            this.selectedUserIds = [];
            this.loadUsers();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al forzar cambio de contraseña:', error);
          this.errorMessage = error.message || 'Error al forzar el cambio de contraseña';
          this.loading = false;
        }
      });
  }

  openBulkDepartmentModal(): void {
    this.showBulkDeptModal = true;
  }

  closeBulkDeptModal(): void {
    this.showBulkDeptModal = false;
    this.bulkDepartmentId = '';
  }

  applyBulkDepartmentChange(): void {
    if (!this.bulkDepartmentId || this.selectedUserIds.length === 0) return;

    this.loading = true;
    this.errorMessage = '';

    this.userService.bulkUpdateDepartment(this.selectedUserIds, this.bulkDepartmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Se ha actualizado el departamento para los usuarios seleccionados correctamente.');
            this.selectedUserIds = [];
            this.closeBulkDeptModal();
            this.loadUsers();
            this.loadStats();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cambiar departamentos masivamente:', error);
          this.errorMessage = error.message || 'Error al cambiar de departamento';
          this.loading = false;
        }
      });
  }

  // Helpers de presentación
  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  getDepartmentLabel(department: any): string {
    return this.userService.getDepartmentLabel(department);
  }

  getPositionLabel(position: any): string {
    if (!position) return '';
    if (typeof position === 'object') {
      return position.name || '';
    }
    return position;
  }

  getRoleBadgeClass(role: UserRole): string {
    return this.userService.getRoleBadgeClass(role);
  }

  getRoleIcon(role: UserRole): string {
    return this.userService.getRoleIcon(role);
  }

  formatDate(date?: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }
}
