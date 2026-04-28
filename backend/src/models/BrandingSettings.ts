import { Schema, model, Document } from 'mongoose';

export interface IBrandingSettings extends Document {
  appName: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarLogo?: string;
  loginLogo?: string;
  reportLogo?: string;
  reportFooter?: string;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const brandingSettingsSchema = new Schema<IBrandingSettings>(
  {
    appName: {
      type: String,
      required: true,
      default: 'CertiVault',
      trim: true,
      maxlength: 80
    },
    companyName: {
      type: String,
      required: true,
      default: 'Netics',
      trim: true,
      maxlength: 120
    },
    primaryColor: {
      type: String,
      required: true,
      default: '#0d6efd',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color principal invalido']
    },
    secondaryColor: {
      type: String,
      required: true,
      default: '#6c757d',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color secundario invalido']
    },
    sidebarLogo: String,
    loginLogo: String,
    reportLogo: String,
    reportFooter: {
      type: String,
      default: 'Reporte generado por CertiVault',
      maxlength: 250
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

export const BrandingSettings = model<IBrandingSettings>('BrandingSettings', brandingSettingsSchema);
