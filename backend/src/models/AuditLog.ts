import { Schema, model, Document } from 'mongoose';

export enum AuditAction {
  ACCESS = 'access',
  ACCESS_DENIED = 'access_denied',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  TEST = 'test',
  DOWNLOAD = 'download',
  DOWNLOAD_FAILED = 'download_failed',
  VIEW = 'view',
  VIEW_FAILED = 'view_failed',
  ERROR = 'error'
}

export interface IAuditLog extends Document {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  userId?: Schema.Types.ObjectId;
  userEmail?: string;
  userRole?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true
    },
    resource: {
      type: String,
      required: true,
      trim: true
    },
    resourceId: {
      type: String,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    userRole: {
      type: String,
      trim: true
    },
    method: String,
    path: String,
    ip: String,
    userAgent: String,
    statusCode: Number,
    message: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ userEmail: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
