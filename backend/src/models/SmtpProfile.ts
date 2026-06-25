import { Schema, model, Document } from 'mongoose';

export interface ISmtpProfile extends Document {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  passwordEncrypted?: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  rejectUnauthorized: boolean;
  connectionTimeout: number;
  lastTestAt?: Date;
  lastTestSuccess?: boolean;
  lastTestMessage?: string;
  sendBackupOnDelete: boolean;
  requirePersonalEmail: boolean;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const smtpProfileSchema = new Schema<ISmtpProfile>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del perfil es requerido'],
      trim: true,
      maxlength: [80, 'El nombre no puede exceder 80 caracteres']
    },
    host: {
      type: String,
      required: [true, 'El host SMTP es requerido'],
      trim: true
    },
    port: {
      type: Number,
      required: [true, 'El puerto SMTP es requerido'],
      min: [1, 'El puerto debe ser mayor a 0'],
      max: [65535, 'El puerto no puede exceder 65535']
    },
    secure: {
      type: Boolean,
      default: false
    },
    username: {
      type: String,
      trim: true
    },
    passwordEncrypted: {
      type: String,
      select: false
    },
    fromName: {
      type: String,
      required: [true, 'El nombre remitente es requerido'],
      trim: true,
      maxlength: [120, 'El nombre remitente no puede exceder 120 caracteres']
    },
    fromEmail: {
      type: String,
      required: [true, 'El email remitente es requerido'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Email remitente invalido']
    },
    isActive: {
      type: Boolean,
      default: false
    },
    rejectUnauthorized: {
      type: Boolean,
      default: false
    },
    connectionTimeout: {
      type: Number,
      default: 15000,
      min: [3000, 'El timeout minimo es 3000 ms'],
      max: [60000, 'El timeout maximo es 60000 ms']
    },
    sendBackupOnDelete: {
      type: Boolean,
      default: true
    },
    requirePersonalEmail: {
      type: Boolean,
      default: true
    },
    lastTestAt: Date,
    lastTestSuccess: Boolean,
    lastTestMessage: String,
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
    timestamps: true
  }
);

smtpProfileSchema.index({ name: 1 }, { unique: true });
smtpProfileSchema.index({ isActive: 1 });

export const SmtpProfile = model<ISmtpProfile>('SmtpProfile', smtpProfileSchema);
