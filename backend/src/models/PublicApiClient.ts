import { Schema, model, Document } from 'mongoose';

export interface IPublicApiClient extends Document {
  name: string;
  description?: string;
  apiKeyHash: string;
  keyHint?: string;
  isActive: boolean;
  canReadCertifications: boolean;
  canDownloadFiles: boolean;
  rateLimitPerMinute: number;
  maxPageSize: number;
  lastUsedAt?: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const publicApiClientSchema = new Schema<IPublicApiClient>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del cliente API es requerido'],
      trim: true,
      maxlength: [80, 'El nombre no puede exceder 80 caracteres'],
      unique: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [250, 'La descripcion no puede exceder 250 caracteres']
    },
    apiKeyHash: {
      type: String,
      required: true,
      select: false
    },
    keyHint: {
      type: String,
      trim: true,
      maxlength: 20
    },
    isActive: {
      type: Boolean,
      default: true
    },
    canReadCertifications: {
      type: Boolean,
      default: true
    },
    canDownloadFiles: {
      type: Boolean,
      default: false
    },
    rateLimitPerMinute: {
      type: Number,
      default: 60,
      min: [1, 'El limite minimo por minuto es 1'],
      max: [10000, 'El limite maximo por minuto es 10000']
    },
    maxPageSize: {
      type: Number,
      default: 50,
      min: [1, 'El maximo de registros por pagina debe ser al menos 1'],
      max: [500, 'El maximo de registros por pagina no puede exceder 500']
    },
    lastUsedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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

publicApiClientSchema.index({ isActive: 1 });

export const PublicApiClient = model<IPublicApiClient>('PublicApiClient', publicApiClientSchema);
