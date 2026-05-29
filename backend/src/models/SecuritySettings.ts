import { Schema, model, Document, Types } from 'mongoose';

export interface ISecuritySettings extends Document {
  passwordExpirationEnabled: boolean;
  passwordExpirationMonths: number;
  certificateExpirationAlertsEnabled: boolean; // Controla si están activas las alertas globales de certificados
  adLoginEnabled: boolean; // Indica si el login por Directorio Activo está habilitado
  adProvider: 'ldap' | 'azure'; // Proveedor de SSO seleccionado
  azureTenantId?: string; // ID del Tenant de Azure
  azureClientId?: string; // ID del Cliente (Application ID) de Azure
  azureClientSecret?: string; // Secreto del cliente (encriptado en BD)
  ldapUrl?: string; // Dirección del servidor LDAP (ej. ldap://servidor)
  ldapBaseDN?: string; // Base DN para búsquedas (ej. dc=empresa,dc=com)
  ldapBindDN?: string; // Bind DN para conexión (ej. cn=admin,dc=empresa,dc=com)
  ldapBindPassword?: string; // Contraseña del Bind DN (encriptada en BD)
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
    certificateExpirationAlertsEnabled: {
      type: Boolean,
      required: true,
      default: true // Alertas habilitadas por defecto
    },
    adLoginEnabled: {
      type: Boolean,
      required: true,
      default: false // Deshabilitado por defecto
    },
    adProvider: {
      type: String,
      enum: ['ldap', 'azure'],
      required: true,
      default: 'azure'
    },
    azureTenantId: {
      type: String,
      trim: true,
      required: false
    },
    azureClientId: {
      type: String,
      trim: true,
      required: false
    },
    azureClientSecret: {
      type: String,
      trim: true,
      required: false
    },
    ldapUrl: {
      type: String,
      trim: true,
      required: false
    },
    ldapBaseDN: {
      type: String,
      trim: true,
      required: false
    },
    ldapBindDN: {
      type: String,
      trim: true,
      required: false
    },
    ldapBindPassword: {
      type: String,
      trim: true,
      required: false
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
