export interface User {
  _id?: string;
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: string;
  phone?: string;
  isActive: boolean;
  // Nuevos campos RBAC
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',           // Administrador global del sistema
  READER = 'reader',         // Solo lectura (consulta)
  TECNICO = 'tecnico',       // Técnico especializado
  LIDER = 'lider',          // Líder de área/departamento
  USER = 'user'             // Usuario básico
}

export enum Department {
  ADMINISTRACION = 'Administración',
  INFRAESTRUCTURA = 'Infraestructura',
  PROYECTOS = 'Proyectos',
  TI = 'TI',
  RRHH = 'RRHH',
  FINANZAS = 'Finanzas',
  OPERACIONES = 'Operaciones',
  VENTAS = 'Ventas',
  MARKETING = 'Marketing',
  INGENIERIA = 'Ingeniería',
  // CALIDAD = 'Calidad',
  SEGURIDAD = 'Seguridad',
  // LEGAL = 'Legal',
  CIBERSEGURIDAD = 'Ciberseguridad'
}

// Permisos RBAC
export enum Permission {
  // Gestión de usuarios
  CREATE_USERS = 'create_users',
  READ_USERS = 'read_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',
  
  // Gestión de certificaciones
  CREATE_CERTIFICATIONS = 'create_certifications',
  READ_CERTIFICATIONS = 'read_certifications',
  UPDATE_CERTIFICATIONS = 'update_certifications',
  DELETE_CERTIFICATIONS = 'delete_certifications',
  
  // Gestión de departamentos
  MANAGE_DEPARTMENTS = 'manage_departments',
  MANAGE_OWN_DEPARTMENT = 'manage_own_department',
  
  // Reportes y estadísticas
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',
  
  // Administración del sistema
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
  password: string;
  firstName: string;
  lastName: string;
  department: Department;
  position: string;
  phone?: string;
  role?: UserRole;
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
}

// Helper interface para obtener información de permisos
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
  [UserRole.LIDER]: 'Líder de Área',
  [UserRole.TECNICO]: 'Técnico',
  [UserRole.READER]: 'Solo Lectura',
  [UserRole.USER]: 'Usuario Básico'
};

// Helper para obtener etiquetas de departamentos
export const DepartmentLabels: Record<Department, string> = {
  [Department.ADMINISTRACION]: 'Administración',
  [Department.INFRAESTRUCTURA]: 'Infraestructura',
  [Department.PROYECTOS]: 'Proyectos',
  [Department.TI]: 'Tecnología de la Información',
  [Department.RRHH]: 'Recursos Humanos',
  [Department.FINANZAS]: 'Finanzas',
  [Department.OPERACIONES]: 'Operaciones',
  [Department.VENTAS]: 'Ventas',
  [Department.MARKETING]: 'Marketing',
  [Department.INGENIERIA]: 'Ingeniería',
  // [Department.CALIDAD]: 'Calidad',
  [Department.SEGURIDAD]: 'Seguridad',
  // [Department.LEGAL]: 'Legal',
  [Department.CIBERSEGURIDAD]: 'Ciberseguridad'
};

