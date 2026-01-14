import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'admin',
  READER = 'reader',
  TECNICO = 'tecnico',
  LIDER = 'lider'
}

export enum Department {
  ADMINISTRACION = 'Administracion',
  INFRAESTRUCTURA = 'Infraestructura',
  PROYECTOS = 'Proyectos',
  TI = 'TI',
  RRHH = 'RRHH',
  FINANZAS = 'Finanzas',
  OPERACIONES = 'Operaciones',
  VENTAS = 'Ventas',
  MARKETING = 'Marketing',
  INGENIERIA = 'Ingenieria',
  CALIDAD = 'Calidad',
  SEGURIDAD = 'Seguridad',
  LEGAL = 'Legal',
  CIBERSEGURIDAD = 'Ciberseguridad'
}

export enum Permission {
  CREATE_USERS = 'create_users',
  READ_USERS = 'read_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',
  CREATE_CERTIFICATIONS = 'create_certifications',
  READ_CERTIFICATIONS = 'read_certifications',
  UPDATE_CERTIFICATIONS = 'update_certifications',
  DELETE_CERTIFICATIONS = 'delete_certifications',
  MANAGE_DEPARTMENTS = 'manage_departments',
  MANAGE_OWN_DEPARTMENT = 'manage_own_department',
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',
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
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  verificationToken?: string;
  verificationExpires?: Date;
  isVerified?: boolean;
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
  createdBy?: mongoose.Types.ObjectId;
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
      maxlength: [20, 'El nombre de usuario no puede tener mas de 20 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalido']
    },
    password: {
      type: String,
      required: [true, 'La contrasena es requerida'],
      minlength: [6, 'La contrasena debe tener al menos 6 caracteres'],
      select: false
    },
    firstName: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener mas de 50 caracteres']
    },
    lastName: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
      maxlength: [50, 'El apellido no puede tener mas de 50 caracteres']
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.READER,
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
      maxlength: [100, 'El cargo no puede tener mas de 100 caracteres']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Numero de telefono invalido']
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
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date
    },
    verificationToken: {
      type: String,
      select: false
    },
    verificationExpires: {
      type: Date
    },
    isVerified: {
      type: Boolean,
      default: true
    },
    departmentLeader: {
      type: Boolean,
      default: false
    },
    managedDepartments: [
      {
        type: String,
        enum: Object.values(Department)
      }
    ],
    permissions: [
      {
        type: String,
        enum: Object.values(Permission)
      }
    ],
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

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (permission: Permission): boolean {
  if (this.role === UserRole.ADMIN) {
    return true;
  }

  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }

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
    ]
  };

  return rolePermissions[this.role as UserRole]?.includes(permission) || false;
};

userSchema.methods.canManageDepartment = function (department: Department): boolean {
  if (this.role === UserRole.ADMIN) {
    return true;
  }

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

userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ departmentLeader: 1 });
userSchema.index({ managedDepartments: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ passwordResetExpires: 1 }, { expireAfterSeconds: 0 });
userSchema.index({ verificationExpires: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model<IUser>('User', userSchema);
