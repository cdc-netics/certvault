import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

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
  CALIDAD = 'Calidad',
  SEGURIDAD = 'Seguridad',
  LEGAL = 'Legal',
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

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  // Nuevos campos RBAC
  departmentLeader?: boolean;   // Es líder de su departamento
  managedDepartments?: Department[];  // Departamentos que gestiona (para líderes multi-área)
  permissions?: Permission[];   // Permisos específicos adicionales
  createdBy?: mongoose.Types.ObjectId;  // Quién creó este usuario
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName: string;
  hasPermission(permission: Permission): boolean;
  canManageDepartment(department: Department): boolean;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es requerido'],
      unique: true,
      trim: true,
      minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
      maxlength: [20, 'El nombre de usuario no puede tener más de 20 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false
    },
    firstName: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    lastName: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
      maxlength: [50, 'El apellido no puede tener más de 50 caracteres']
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true
    },
    department: {
      type: String,
      enum: Object.values(Department),
      required: [true, 'El departamento es requerido']
    },
    position: {
      type: String,
      required: [true, 'El cargo es requerido'],
      trim: true,
      maxlength: [100, 'El cargo no puede tener más de 100 caracteres']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Número de teléfono inválido']
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    refreshToken: {
      type: String,
      select: false
    },
    // Nuevos campos RBAC
    departmentLeader: {
      type: Boolean,
      default: false
    },
    managedDepartments: [{
      type: String,
      enum: Object.values(Department)
    }],
    permissions: [{
      type: String,
      enum: Object.values(Permission)
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Virtual para nombre completo
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Encriptar contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para verificar permisos
userSchema.methods.hasPermission = function(permission: Permission): boolean {
  // El admin tiene todos los permisos
  if (this.role === UserRole.ADMIN) {
    return true;
  }
  
  // Verificar permisos específicos asignados
  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }
  
  // Permisos por rol
  const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: Object.values(Permission),
    [UserRole.LIDER]: [
      Permission.READ_USERS,
      Permission.UPDATE_USERS,
      Permission.DELETE_USERS,
      Permission.MANAGE_ROLES,
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
  
  return rolePermissions[this.role as UserRole]?.includes(permission) || false;
};

// Método para verificar si puede gestionar un departamento
userSchema.methods.canManageDepartment = function(department: Department): boolean {
  // El admin puede gestionar cualquier departamento
  if (this.role === UserRole.ADMIN) {
    return true;
  }
  
  // Los líderes pueden gestionar su propio departamento
  if (this.role === UserRole.LIDER) {
    if (this.department === department) {
      return true;
    }
    if (this.managedDepartments && this.managedDepartments.includes(department)) {
      return true;
    }
  }
  
  return false;
};

// Índices adicionales (email y username ya son únicos en el esquema)
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ departmentLeader: 1 });
userSchema.index({ managedDepartments: 1 });
userSchema.index({ createdBy: 1 });

export const User = mongoose.model<IUser>('User', userSchema);

