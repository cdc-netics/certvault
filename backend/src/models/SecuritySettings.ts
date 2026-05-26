import { Schema, model, Document, Types } from 'mongoose';

export interface ISecuritySettings extends Document {
  passwordExpirationEnabled: boolean;
  passwordExpirationMonths: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const securitySettingsSchema = new Schema<ISecuritySettings>(
  {
    passwordExpirationEnabled: {
      type: Boolean,
      required: true,
      default: false
    },
    passwordExpirationMonths: {
      type: Number,
      required: true,
      default: 3, // Duración por defecto de 3 meses
      min: [1, 'La duración mínima debe ser de 1 mes'],
      max: [12, 'La duración máxima debe ser de 12 meses']
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

export const SecuritySettings = model<ISecuritySettings>('SecuritySettings', securitySettingsSchema);
