import mongoose, { Document, Schema } from 'mongoose';

export enum CertificationType {
  TECHNICAL = 'technical',
  PROFESSIONAL = 'professional',
  SECURITY = 'security',
  CLOUD = 'cloud',
  MANAGEMENT = 'management',
  SOFT_SKILLS = 'soft_skills',
  COMPLIANCE = 'compliance',
  OTHER = 'other'
}

export enum CertificationLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon',
  PENDING = 'pending',
  REVOKED = 'revoked'
}

export interface ICertification extends Document {
  title: string;
  description?: string;
  type: CertificationType;
  technology: string;
  provider: string;
  level: CertificationLevel;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  department: string;
  issueDate: Date;
  expirationDate?: Date;
  certificateNumber: string;
  certificateUrl?: string;
  status: CertificationStatus;
  score?: number;
  validationUrl?: string;
  tags: string[];
  cost?: number;
  currency?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  daysUntilExpiration: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

const certificationSchema = new Schema<ICertification>(
  {
    title: {
      type: String,
      required: [true, 'El título de la certificación es requerido'],
      trim: true,
      maxlength: [200, 'El título no puede tener más de 200 caracteres']
    },
    description: {
      type: String,
      required: false,
      default: '',
      trim: true,
      maxlength: [1000, 'La descripcion no puede tener mas de 1000 caracteres']
    },
    type: {
      type: String,
      enum: Object.values(CertificationType),
      required: [true, 'El tipo de certificación es requerido']
    },
    technology: {
      type: String,
      required: [true, 'La tecnología es requerida'],
      trim: true,
      maxlength: [100, 'La tecnología no puede tener más de 100 caracteres']
    },
    provider: {
      type: String,
      required: [true, 'El proveedor es requerido'],
      trim: true,
      maxlength: [100, 'El proveedor no puede tener más de 100 caracteres']
    },
    level: {
      type: String,
      enum: Object.values(CertificationLevel),
      required: [true, 'El nivel es requerido']
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El ID del empleado es requerido']
    },
    employeeName: {
      type: String,
      required: [true, 'El nombre del empleado es requerido'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'El departamento es requerido'],
      trim: true,
      maxlength: [100, 'El departamento no puede tener más de 100 caracteres']
    },
    issueDate: {
      type: Date,
      required: [true, 'La fecha de emisión es requerida']
    },
    expirationDate: {
      type: Date,
      required: false,
      validate: {
        validator: function(this: ICertification, value: Date) {
          return !value || value > this.issueDate;
        },
        message: 'La fecha de expiracion debe ser posterior a la fecha de emision'
      }
    },
    certificateNumber: {
      type: String,
      required: [true, 'El número de certificado es requerido'],
      trim: true,
      unique: true,
      maxlength: [100, 'El número de certificado no puede tener más de 100 caracteres']
    },
    certificateUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'URL inválida']
    },
    status: {
      type: String,
      enum: Object.values(CertificationStatus),
      default: CertificationStatus.PENDING
    },
    score: {
      type: Number,
      min: [0, 'La puntuación no puede ser negativa'],
      max: [100, 'La puntuación no puede ser mayor a 100']
    },
    validationUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'URL de validación inválida']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Cada tag no puede tener más de 50 caracteres']
    }],
    cost: {
      type: Number,
      min: [0, 'El costo no puede ser negativo']
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: [3, 'La moneda debe tener 3 caracteres'],
      maxlength: [3, 'La moneda debe tener 3 caracteres'],
      default: 'USD'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Las notas no pueden tener más de 500 caracteres']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Virtual para dias hasta expiracion
certificationSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expirationDate) return null;
  const today = new Date();
  const expiration = new Date(this.expirationDate as Date);
  const diffTime = expiration.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar si esta expirada
certificationSchema.virtual('isExpired').get(function() {
  return this.expirationDate ? new Date() > new Date(this.expirationDate as Date) : false;
});

// Virtual para verificar si expira pronto (30 dias)
certificationSchema.virtual('isExpiringSoon').get(function() {
  const daysUntilExpiration = this.daysUntilExpiration;
  return typeof daysUntilExpiration === 'number' && daysUntilExpiration > 0 && daysUntilExpiration <= 30;
});

// Middleware para actualizar el status automáticamente
certificationSchema.pre('save', function(next) {
  if (this.isExpired) {
    this.status = CertificationStatus.EXPIRED;
  } else if (this.isExpiringSoon) {
    this.status = CertificationStatus.EXPIRING_SOON;
  } else if (this.status === CertificationStatus.PENDING) {
    this.status = CertificationStatus.ACTIVE;
  }
  next();
});

// Índices para optimizar consultas (certificateNumber ya es único en el esquema)
certificationSchema.index({ employeeId: 1 });
certificationSchema.index({ department: 1 });
certificationSchema.index({ type: 1 });
certificationSchema.index({ technology: 1 });
certificationSchema.index({ status: 1 });
certificationSchema.index({ expirationDate: 1 });
certificationSchema.index({ issueDate: 1 });
certificationSchema.index({ title: 'text', description: 'text', technology: 'text' });

export const Certification = mongoose.model<ICertification>('Certification', certificationSchema);







