export interface Department {
  _id: string;
  name: string;
  code: string;
  leaderId?: string | User;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Position {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  _id?: string;
  username: string;
  email: string;
  personalEmail: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: Position | string;
  phone?: string;
  isActive: boolean;
  avatarUrl?: string;
  avatar?: string;
  // Nuevos campos RBAC
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  mustChangePassword?: boolean;
  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  READER = 'reader',
  TECNICO = 'tecnico',
  LIDER = 'lider'
}

// Se eliminó el enum Department para utilizar la interfaz dinámica Department de base de datos

// Permisos RBAC
export enum Permission {
  // Gestion de usuarios
  CREATE_USERS = 'create_users',
  READ_USERS = 'read_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',

  // Gestion de certificaciones
  CREATE_CERTIFICATIONS = 'create_certifications',
  READ_CERTIFICATIONS = 'read_certifications',
  UPDATE_CERTIFICATIONS = 'update_certifications',
  DELETE_CERTIFICATIONS = 'delete_certifications',

  // Gestion de departamentos
  MANAGE_DEPARTMENTS = 'manage_departments',
  MANAGE_OWN_DEPARTMENT = 'manage_own_department',

  // Reportes y estadisticas
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',

  // Administracion del sistema
  SYSTEM_ADMIN = 'system_admin'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  personalEmail: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string; // ID o nombre
  position: string; // ID o nombre
  phone?: string;
  role?: UserRole;
  departmentLeader?: boolean;
  managedDepartments?: string[];
  permissions?: Permission[];
}

// Helper interface para obtener informacion de permisos
export interface UserPermissions {
  canCreateUsers: boolean;
  canUpdateUsers: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;
  canCreateCertifications: boolean;
  canUpdateCertifications: boolean;
  canDeleteCertifications: boolean;
  canManageDepartments: boolean;
  canManageOwnDepartment: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  isSystemAdmin: boolean;
}

// Helper para obtener etiquetas de roles
export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.LIDER]: 'Lider de area',
  [UserRole.TECNICO]: 'Tecnico',
  [UserRole.READER]: 'Solo Lectura'
};

// Se eliminó el mapeo estático DepartmentLabels ya que las etiquetas de departamentos se consumen de forma dinámica desde el backend.
