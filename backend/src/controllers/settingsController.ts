import { Request, Response } from 'express';
import { AuditAction, AuditLog } from '../models/AuditLog';
import { BrandingSettings } from '../models/BrandingSettings';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { PublicApiClient } from '../models/PublicApiClient';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { toSafeSmtpProfile } from '../services/smtpProfileService';
import { clearApiKeyCache } from '../middleware/apiKey';
import crypto from 'crypto';
import fs from 'fs';
import { generateConfigBackup, generateFullBackup, restoreBackup, systemWipe as performSystemWipe } from '../services/backupService';

const getDateRange = (req: Request) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const range: Record<string, Date> = {};
  if (from && !Number.isNaN(from.getTime())) range.$gte = from;
  if (to && !Number.isNaN(to.getTime())) range.$lte = to;
  return Object.keys(range).length > 0 ? range : undefined;
};

const getBrandingDocument = async () => {
  const existing = await BrandingSettings.findOne().sort({ updatedAt: -1 });
  if (existing) return existing;
  return BrandingSettings.create({});
};

const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

const generateApiKey = (): string => {
  return crypto.randomBytes(24).toString('base64url');
};

const toSafePublicApiClient = (client: any) => ({
  id: client._id?.toString() || client.id,
  name: client.name,
  description: client.description || '',
  isActive: Boolean(client.isActive),
  canReadCertifications: Boolean(client.canReadCertifications),
  canDownloadFiles: Boolean(client.canDownloadFiles),
  rateLimitPerMinute: Number(client.rateLimitPerMinute || 60),
  maxPageSize: Number(client.maxPageSize || 50),
  keyHint: client.keyHint || '',
  lastUsedAt: client.lastUsedAt,
  createdAt: client.createdAt,
  updatedAt: client.updatedAt,
  endpoint: '/api/certifications/public/external',
  downloadEndpointPattern: '/api/certifications/public/external/:id/file'
});

const csvEscape = (value: unknown): string => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const filter: Record<string, unknown> = {};

    if (req.query.action) {
      filter.action = req.query.action;
    } else {
      filter.action = { $ne: AuditAction.ACCESS };
    }
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.userEmail) filter.userEmail = { $regex: req.query.userEmail, $options: 'i' };
    const createdAt = getDateRange(req);
    if (createdAt) filter.createdAt = createdAt;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo auditoria:', error);
    res.status(500).json({ success: false, error: 'Error al obtener auditoria' });
  }
};

export const exportBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const backupType = req.query.type as string || 'full';
    
    // Generar el ZIP correspondiente según el tipo solicitado
    const zipBuffer = backupType === 'config' 
      ? await generateConfigBackup() 
      : await generateFullBackup();

    await recordAuditLog({
      action: AuditAction.EXPORT,
      resource: 'backup',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      message: `Backup ${backupType} exportado`
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="certivault-backup-${backupType}-${Date.now()}.zip"`);
    res.status(200).send(zipBuffer);
  } catch (error) {
    console.error('Error exportando backup:', error);
    res.status(500).json({ success: false, error: 'Error al exportar backup' });
  }
};

export const importBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se ha proporcionado ningún archivo ZIP' });
      return;
    }

    // Leer el buffer del archivo subido
    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);

    // Restaurar los datos desde el ZIP
    await restoreBackup(fileBuffer);

    // Registrar en auditoría
    await recordAuditLog({
      action: AuditAction.CREATE,
      resource: 'backup',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      message: 'Backup importado y restaurado exitosamente'
    });

    // Limpiar el archivo subido si existe en disco temporal
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ success: true, message: 'Respaldo importado exitosamente' });
  } catch (error: any) {
    console.error('Error importando backup:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al importar backup' });
  }
};

export const getBackupSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [users, certifications, smtpProfiles, auditLogs] = await Promise.all([
      User.countDocuments(),
      Certification.countDocuments(),
      SmtpProfile.countDocuments(),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      data: { users, certifications, smtpProfiles, auditLogs }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener resumen de backup' });
  }
};

export const systemWipe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await performSystemWipe();
    
    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'system',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      message: 'System wipe ejecutado'
    });

    res.json({ success: true, message: 'Sistema borrado exitosamente. Solo se conservó el administrador por defecto.' });
  } catch (error) {
    console.error('Error en system wipe:', error);
    res.status(500).json({ success: false, error: 'Error al realizar el borrado del sistema' });
  }
};

export const getBranding = async (_req: Request, res: Response): Promise<void> => {
  try {
    const branding = await getBrandingDocument();
    res.json({ success: true, data: branding });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener branding' });
  }
};

export const updateBranding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branding = await getBrandingDocument();
    const allowed = ['appName', 'companyName', 'primaryColor', 'secondaryColor', 'sidebarLogo', 'loginLogo', 'reportLogo', 'reportFooter'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (branding as any)[key] = req.body[key];
      }
    }
    (branding as any).updatedBy = req.user?._id;
    await branding.save();
    res.json({ success: true, data: branding, message: 'Branding actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando branding:', error);
    res.status(400).json({ success: false, error: 'Error al actualizar branding' });
  }
};

export const getPublicApiClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await PublicApiClient.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: clients.map(toSafePublicApiClient)
    });
  } catch (error) {
    console.error('Error obteniendo clientes de API externa:', error);
    res.status(500).json({ success: false, error: 'Error al obtener clientes de API externa' });
  }
};

export const createPublicApiClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const providedKey = typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const apiKey = providedKey || generateApiKey();

    if (apiKey.length < 12) {
      res.status(400).json({ success: false, error: 'La API key debe tener al menos 12 caracteres' });
      return;
    }

    const client = await PublicApiClient.create({
      name: req.body.name,
      description: req.body.description || '',
      apiKeyHash: hashApiKey(apiKey),
      keyHint: `***${apiKey.slice(-4)}`,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : true,
      canReadCertifications: true,
      canDownloadFiles: Boolean(req.body.canDownloadFiles),
      rateLimitPerMinute: Number(req.body.rateLimitPerMinute || 60),
      maxPageSize: Number(req.body.maxPageSize || 50),
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    clearApiKeyCache();

    res.json({
      success: true,
      data: {
        client: toSafePublicApiClient(client),
        apiKey
      },
      message: 'Cliente API creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando cliente API externo:', error);
    res.status(500).json({ success: false, error: 'Error al crear cliente de API externa' });
  }
};

export const updatePublicApiClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await PublicApiClient.findById(req.params.id).select('+apiKeyHash');
    if (!client) {
      res.status(404).json({ success: false, error: 'Cliente API no encontrado' });
      return;
    }

    const fields = ['name', 'description', 'isActive', 'canDownloadFiles', 'rateLimitPerMinute', 'maxPageSize'] as const;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        (client as any)[field] = req.body[field];
      }
    }

    const newApiKey = typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : '';
    let returnedApiKey: string | undefined;
    if (newApiKey) {
      if (newApiKey.length < 12) {
        res.status(400).json({ success: false, error: 'La API key debe tener al menos 12 caracteres' });
        return;
      }
      (client as any).apiKeyHash = hashApiKey(newApiKey);
      client.keyHint = `***${newApiKey.slice(-4)}`;
      returnedApiKey = newApiKey;
    }

    (client as any).updatedBy = req.user?._id;
    await client.save();
    clearApiKeyCache();

    res.json({
      success: true,
      data: {
        client: toSafePublicApiClient(client),
        apiKey: returnedApiKey
      },
      message: 'Cliente API actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando cliente API externo:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cliente de API externa' });
  }
};

export const rotatePublicApiClientKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await PublicApiClient.findById(req.params.id).select('+apiKeyHash');
    if (!client) {
      res.status(404).json({ success: false, error: 'Cliente API no encontrado' });
      return;
    }

    const newApiKey = generateApiKey();
    (client as any).apiKeyHash = hashApiKey(newApiKey);
    client.keyHint = `***${newApiKey.slice(-4)}`;
    (client as any).updatedBy = req.user?._id;

    await client.save();
    clearApiKeyCache();

    res.json({
      success: true,
      data: {
        client: toSafePublicApiClient(client),
        apiKey: newApiKey
      },
      message: 'API key regenerada exitosamente'
    });
  } catch (error) {
    console.error('Error regenerando API key de cliente externo:', error);
    res.status(500).json({ success: false, error: 'Error al regenerar API key del cliente' });
  }
};

export const deletePublicApiClient = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await PublicApiClient.findByIdAndDelete(_req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Cliente API no encontrado' });
      return;
    }

    clearApiKeyCache();
    res.json({ success: true, message: 'Cliente API eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente API externo:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar cliente de API externa' });
  }
};

export const testPublicApiClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await PublicApiClient.findById(req.params.id);
    if (!client) {
      res.status(404).json({ success: false, error: 'Cliente API no encontrado' });
      return;
    }

    if (!client.isActive) {
      res.status(400).json({ success: false, error: 'El cliente API esta inactivo' });
      return;
    }

    if (!client.canReadCertifications) {
      res.status(400).json({ success: false, error: 'El cliente API no tiene permiso de lectura' });
      return;
    }

    const [totalVisible, sample] = await Promise.all([
      Certification.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: '$employee' },
        { $match: { 'employee.isActive': true } },
        { $count: 'count' }
      ]),
      Certification.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: '$employee' },
        { $match: { 'employee.isActive': true } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        { $project: { _id: 1, title: 1, certificateUrl: 1 } }
      ])
    ]);

    const total = totalVisible[0]?.count || 0;
    const sampleItem = sample[0];

    res.json({
      success: true,
      data: {
        client: toSafePublicApiClient(client),
        result: {
          readEndpoint: '/api/certifications/public/external?page=1&limit=5',
          downloadEndpoint: sampleItem && client.canDownloadFiles ? `/api/certifications/public/external/${sampleItem._id}/file` : null,
          visibleCertifications: total,
          sampleCertificationTitle: sampleItem?.title || null
        }
      },
      message: 'Prueba de cliente API completada'
    });
  } catch (error) {
    console.error('Error probando cliente API externo:', error);
    res.status(500).json({ success: false, error: 'Error al probar cliente de API externa' });
  }
};

export const getReportsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const certificationFilter: Record<string, unknown> = {};
    if (req.query.department) certificationFilter.department = req.query.department;
    if (req.query.status) certificationFilter.status = req.query.status;
    const issueDate = getDateRange(req);
    if (issueDate) certificationFilter.issueDate = issueDate;

    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 30);

    const [totalCertifications, active, expired, expiringSoon, totalUsers, activeUsers, byDepartment, byStatus, byProvider, byTechnology] =
      await Promise.all([
        Certification.countDocuments(certificationFilter),
        Certification.countDocuments({ ...certificationFilter, status: 'active' }),
        Certification.countDocuments({ ...certificationFilter, status: 'expired' }),
        Certification.countDocuments({ ...certificationFilter, expirationDate: { $gte: now, $lte: soon } }),
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Certification.aggregate([{ $match: certificationFilter }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Certification.aggregate([{ $match: certificationFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Certification.aggregate([{ $match: certificationFilter }, { $group: { _id: '$provider', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
        Certification.aggregate([{ $match: certificationFilter }, { $group: { _id: '$technology', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }])
      ]);

    res.json({
      success: true,
      data: {
        totals: { totalCertifications, active, expired, expiringSoon, totalUsers, activeUsers },
        byDepartment,
        byStatus,
        byProvider,
        byTechnology
      }
    });
  } catch (error) {
    console.error('Error generando reportes:', error);
    res.status(500).json({ success: false, error: 'Error al generar reportes' });
  }
};

export const exportReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await Certification.find().sort({ department: 1, employeeName: 1 }).lean();
    const header = ['Titulo', 'Empleado', 'Departamento', 'Proveedor', 'Tecnologia', 'Estado', 'Emision', 'Expiracion'];
    const csv = [
      header.map(csvEscape).join(','),
      ...rows.map(row => [
        row.title,
        row.employeeName,
        row.department,
        row.provider,
        row.technology,
        row.status,
        row.issueDate ? new Date(row.issueDate).toISOString().slice(0, 10) : '',
        row.expirationDate ? new Date(row.expirationDate).toISOString().slice(0, 10) : ''
      ].map(csvEscape).join(','))
    ].join('\n');

    await recordAuditLog({
      action: AuditAction.EXPORT,
      resource: 'reports',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      message: 'Reporte CSV exportado'
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="certificaciones-reporte-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al exportar reporte' });
  }
};
