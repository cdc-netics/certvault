import { Request, Response, NextFunction } from 'express';
import { AuditAction, AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

interface AuditPayload {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  userId?: unknown;
  userEmail?: string;
  userRole?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

const sanitizeMetadata = (metadata?: Record<string, unknown>): Record<string, unknown> => {
  if (!metadata) return {};
  const clone = { ...metadata };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|authorization/i.test(key)) {
      clone[key] = '[redacted]';
    }
  }
  return clone;
};

export const recordAuditLog = async (payload: AuditPayload): Promise<void> => {
  try {
    await AuditLog.create({
      ...payload,
      metadata: sanitizeMetadata(payload.metadata)
    });
  } catch (error) {
    console.warn('No se pudo registrar auditoria:', error);
  }
};

const resolveResource = (path: string): string => {
  if (path.includes('/settings/backup')) return 'backup';
  if (path.includes('/settings/reports')) return 'reports';
  if (path.includes('/settings/smtp-profiles')) return 'smtp';
  if (path.includes('/settings/branding')) return 'branding';
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.startsWith('/api/users')) return 'users';
  if (path.startsWith('/api/certifications')) return 'certifications';
  if (path.startsWith('/api/settings')) return 'settings';
  if (path.startsWith('/api/dashboard')) return 'dashboard';
  return 'system';
};

const resolveAction = (method: string): AuditAction => {
  if (method === 'POST') return AuditAction.CREATE;
  if (method === 'PUT' || method === 'PATCH') return AuditAction.UPDATE;
  if (method === 'DELETE') return AuditAction.DELETE;
  return AuditAction.ACCESS;
};

export const auditRequest = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.originalUrl.split('?')[0] || req.path;
  const isApiRequest = path.startsWith('/api/');
  const isAuditRead = path.startsWith('/api/settings/audit-logs');

  if (!isApiRequest || isAuditRead) {
    next();
    return;
  }

  res.on('finish', () => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    const isAuthEvent =
      path.startsWith('/api/auth/login') ||
      path.startsWith('/api/auth/logout') ||
      path.startsWith('/api/auth/forgot-password') ||
      path.startsWith('/api/auth/reset-password') ||
      path.startsWith('/api/auth/change-password');
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isSensitiveExport = path.includes('/backup/export') || path.includes('/reports/export');
    const isSecurityTest = path.includes('/smtp-profiles/') && path.endsWith('/test');
    const isDenied = [401, 403, 429].includes(res.statusCode);
    const shouldRecord = isAuthEvent || isMutation || isSensitiveExport || isSecurityTest || isDenied;
    const routeParamId = Array.isArray(req.params?.id) ? req.params.id[0] : req.params?.id;

    if (!shouldRecord) return;

    const action =
      isDenied
        ? AuditAction.ACCESS_DENIED
        : path.startsWith('/api/auth/login') && res.statusCode < 400
        ? AuditAction.LOGIN_SUCCESS
        : path.startsWith('/api/auth/login')
          ? AuditAction.LOGIN_FAILED
          : path.startsWith('/api/auth/logout')
            ? AuditAction.LOGOUT
            : isSensitiveExport
              ? AuditAction.EXPORT
              : isSecurityTest
                ? AuditAction.TEST
                : resolveAction(req.method);

    void recordAuditLog({
      action,
      resource: resolveResource(path),
      resourceId: routeParamId,
      userId: user?._id,
      userEmail: user?.email || req.body?.email,
      userRole: user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      message: `${req.method} ${req.originalUrl}`,
      metadata: req.method === 'GET' ? req.query as Record<string, unknown> : req.body
    });
  });

  next();
};
