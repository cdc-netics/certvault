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
  users: User[] = [];
  loading = false;
  errorMessage = '';
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

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
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
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.firstName} ${user.lastName}? Esta acción enviará un respaldo con sus certificados a su correo personal y los borrará de forma permanente.`)) {
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

  // Helpers de presentación
  getRoleLabel(role: UserRole): string {
    return this.userService.getRoleLabel(role);
  }

  getDepartmentLabel(department: Department): string {
    return this.userService.getDepartmentLabel(department);
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
