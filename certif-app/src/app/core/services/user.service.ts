import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  User, 
  UserRole, 
  Department, 
  Permission, 
  RegisterRequest, 
  UserPermissions,
  UserRoleLabels,
  DepartmentLabels 
} from '../models/user.model';
import { ApiResponse } from '../models/common.model';

export interface UsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  departmentLeaders: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  department?: Department;
  isActive?: boolean;
  departmentLeader?: boolean;
}

export interface DepartmentOption {
  key: string;
  value: Department;
  label: string;
}

export interface RoleOption {
  key: string;
  value: UserRole;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Relative path to work in dev/prod behind proxy
  private readonly API_URL = '/api/users';

  constructor(private readonly http: HttpClient) {}

  // Obtener lista de usuarios con filtros y paginación
  getUsers(query: UsersQuery = {}): Observable<ApiResponse<UsersResponse>> {
    let params = new HttpParams();
    
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.role) params = params.set('role', query.role);
    if (query.department) params = params.set('department', query.department);
    if (typeof query.isActive === 'boolean') params = params.set('isActive', query.isActive.toString());
    if (typeof query.departmentLeader === 'boolean') params = params.set('departmentLeader', query.departmentLeader.toString());

    return this.http.get<ApiResponse<UsersResponse>>(this.API_URL, { params })
      .pipe(catchError(this.handleError));
  }

  // Obtener usuario por ID
  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Crear nuevo usuario
  createUser(userData: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.API_URL, userData)
      .pipe(catchError(this.handleError));
  }

  // Actualizar usuario
  updateUser(id: string, userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/${id}`, userData)
      .pipe(catchError(this.handleError));
  }

  // Eliminar usuario
  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Obtener estadísticas de usuarios
  getUserStats(): Observable<ApiResponse<UserStats>> {
    return this.http.get<ApiResponse<UserStats>>(`${this.API_URL}/stats`)
      .pipe(catchError(this.handleError));
  }

  // Obtener departamentos disponibles
  getDepartments(): Observable<ApiResponse<DepartmentOption[]>> {
    return this.http.get<ApiResponse<DepartmentOption[]>>(`${this.API_URL}/departments`)
      .pipe(catchError(this.handleError));
  }

  // Obtener roles disponibles
  getRoles(): Observable<ApiResponse<RoleOption[]>> {
    return this.http.get<ApiResponse<RoleOption[]>>(`${this.API_URL}/roles`)
      .pipe(catchError(this.handleError));
  }

  // Helper: Obtener permisos de usuario
  getUserPermissions(user: User): UserPermissions {
    // Simulación de verificación de permisos basada en rol
    // En un sistema real, esto vendría del backend
    const permissions: UserPermissions = {
      canCreateUsers: this.hasPermission(user, Permission.CREATE_USERS),
      canUpdateUsers: this.hasPermission(user, Permission.UPDATE_USERS),
      canDeleteUsers: this.hasPermission(user, Permission.DELETE_USERS),
      canManageRoles: this.hasPermission(user, Permission.MANAGE_ROLES),
      canCreateCertifications: this.hasPermission(user, Permission.CREATE_CERTIFICATIONS),
      canUpdateCertifications: this.hasPermission(user, Permission.UPDATE_CERTIFICATIONS),
      canDeleteCertifications: this.hasPermission(user, Permission.DELETE_CERTIFICATIONS),
      canManageDepartments: this.hasPermission(user, Permission.MANAGE_DEPARTMENTS),
      canManageOwnDepartment: this.hasPermission(user, Permission.MANAGE_OWN_DEPARTMENT),
      canViewReports: this.hasPermission(user, Permission.VIEW_REPORTS),
      canExportData: this.hasPermission(user, Permission.EXPORT_DATA),
      isSystemAdmin: this.hasPermission(user, Permission.SYSTEM_ADMIN)
    };

    return permissions;
  }

  // Helper: Verificar si el usuario tiene un permiso específico
  private hasPermission(user: User, permission: Permission): boolean {
    // El admin tiene todos los permisos
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Verificar permisos específicos asignados
    if (user.permissions?.includes(permission)) {
      return true;
    }

    // Permisos por rol (debe coincidir con el backend)
    const rolePermissions: Record<UserRole, Permission[]> = {
      [UserRole.ADMIN]: Object.values(Permission),
      [UserRole.LIDER]: [
        Permission.READ_USERS,
        Permission.UPDATE_USERS,
        Permission.CREATE_USERS,
        Permission.MANAGE_OWN_DEPARTMENT,
        Permission.CREATE_CERTIFICATIONS,
        Permission.READ_CERTIFICATIONS,
        Permission.UPDATE_CERTIFICATIONS,
        Permission.DELETE_CERTIFICATIONS,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA
      ],
      [UserRole.TECNICO]: [
        Permission.CREATE_CERTIFICATIONS,
        Permission.READ_CERTIFICATIONS,
        Permission.UPDATE_CERTIFICATIONS,
        Permission.READ_USERS,
        Permission.VIEW_REPORTS
      ],
      [UserRole.READER]: [
        Permission.READ_CERTIFICATIONS,
        Permission.READ_USERS,
        Permission.VIEW_REPORTS
      ],
      [UserRole.USER]: [
        Permission.READ_CERTIFICATIONS,
        Permission.VIEW_REPORTS
      ]
    };

    return rolePermissions[user.role]?.includes(permission) || false;
  }

  // Helper: Obtener etiqueta del rol
  getRoleLabel(role: UserRole): string {
    return UserRoleLabels[role] || role;
  }

  // Helper: Obtener etiqueta del departamento
  getDepartmentLabel(department: Department): string {
    return DepartmentLabels[department] || department;
  }

  // Helper: Verificar si puede gestionar un departamento
  canManageDepartment(user: User, department: Department): boolean {
    // El admin puede gestionar cualquier departamento
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Los líderes pueden gestionar su propio departamento
    if (user.role === UserRole.LIDER) {
      // Puede gestionar su departamento principal
      if (user.department === department) {
        return true;
      }

      // Puede gestionar departamentos adicionales asignados
      if (user.managedDepartments?.includes(department)) {
        return true;
      }
    }

    return false;
  }

  // Helper: Obtener estilos CSS para badges de roles
  getRoleBadgeClass(role: UserRole): string {
    const classes = {
      [UserRole.ADMIN]: 'badge bg-danger',
      [UserRole.LIDER]: 'badge bg-warning text-dark',
      [UserRole.TECNICO]: 'badge bg-info',
      [UserRole.READER]: 'badge bg-secondary',
      [UserRole.USER]: 'badge bg-primary'
    };
    return classes[role] || 'badge bg-light text-dark';
  }

  // Helper: Obtener icono para roles
  getRoleIcon(role: UserRole): string {
    const icons = {
      [UserRole.ADMIN]: 'fas fa-crown',
      [UserRole.LIDER]: 'fas fa-star',
      [UserRole.TECNICO]: 'fas fa-cogs',
      [UserRole.READER]: 'fas fa-eye',
      [UserRole.USER]: 'fas fa-user'
    };
    return icons[role] || 'fas fa-user';
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.error || `Error ${error.status}: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
