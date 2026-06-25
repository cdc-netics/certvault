import { Request, Response } from 'express';
import { AuditAction, AuditLog } from '../models/AuditLog';
import { BrandingSettings } from '../models/BrandingSettings';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { PublicApiClient } from '../models/PublicApiClient';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { SecuritySettings } from '../models/SecuritySettings';
import { recordAuditLog } from '../services/auditService';
import { toSafeSmtpProfile } from '../services/smtpProfileService';
import { clearApiKeyCache } from '../middleware/apiKey';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
  generateConfigBackup, 
  generateFullBackup, 
  restoreBackup, 
  systemWipe as performSystemWipe,
  getLocalBackupsList,
  runLocalBackup
} from '../services/backupService';

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

export const getSecuritySettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await SecuritySettings.findOne().sort({ updatedAt: -1 });
    if (!settings) {
      settings = await SecuritySettings.create({
        passwordExpirationEnabled: false,
        passwordExpirationMonths: 3,
        certificateExpirationAlertsEnabled: true,
        adLoginEnabled: false,
        adProvider: 'azure'
      });
    }

    // Convertir a objeto plano para poder enmascarar campos confidenciales
    const settingsObj = settings.toObject();
    if (settingsObj.azureClientSecret) {
      settingsObj.azureClientSecret = '******';
    }
    if (settingsObj.ldapBindPassword) {
      settingsObj.ldapBindPassword = '******';
    }

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error obteniendo configuracion de seguridad:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuracion de seguridad' });
  }
};

export const updateSecuritySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let settings = await SecuritySettings.findOne().sort({ updatedAt: -1 });
    if (!settings) {
      settings = new SecuritySettings();
    }

    const {
      passwordExpirationEnabled,
      passwordExpirationMonths,
      certificateExpirationAlertsEnabled,
      adLoginEnabled,
      adProvider,
      azureTenantId,
      azureClientId,
      azureClientSecret,
      ldapUrl,
      ldapBaseDN,
      ldapBindDN,
      ldapBindPassword,
      autoBackupEnabled,
      autoBackupIntervalDays
    } = req.body;

    if (passwordExpirationEnabled !== undefined) {
      settings.passwordExpirationEnabled = Boolean(passwordExpirationEnabled);
    }
    if (passwordExpirationMonths !== undefined) {
      settings.passwordExpirationMonths = Number(passwordExpirationMonths);
    }
    if (certificateExpirationAlertsEnabled !== undefined) {
      settings.certificateExpirationAlertsEnabled = Boolean(certificateExpirationAlertsEnabled);
    }
    if (autoBackupEnabled !== undefined) {
      settings.autoBackupEnabled = Boolean(autoBackupEnabled);
    }
    if (autoBackupIntervalDays !== undefined) {
      settings.autoBackupIntervalDays = Number(autoBackupIntervalDays);
    }

    // Configuraciones de Directorio Activo (SSO)
    if (adLoginEnabled !== undefined) {
      settings.adLoginEnabled = Boolean(adLoginEnabled);
    }
    if (adProvider !== undefined) {
      settings.adProvider = adProvider;
    }
    if (azureTenantId !== undefined) {
      settings.azureTenantId = azureTenantId;
    }
    if (azureClientId !== undefined) {
      settings.azureClientId = azureClientId;
    }
    
    // Cifrado de secreto de Azure AD si cambió y no es la máscara
    if (azureClientSecret !== undefined && azureClientSecret !== '******') {
      const { encrypt } = await import('../utils/crypto');
      settings.azureClientSecret = encrypt(azureClientSecret);
    }
    
    if (ldapUrl !== undefined) {
      settings.ldapUrl = ldapUrl;
    }
    if (ldapBaseDN !== undefined) {
      settings.ldapBaseDN = ldapBaseDN;
    }
    if (ldapBindDN !== undefined) {
      settings.ldapBindDN = ldapBindDN;
    }
    
    // Cifrado de contraseña de Bind DN de LDAP si cambió y no es la máscara
    if (ldapBindPassword !== undefined && ldapBindPassword !== '******') {
      const { encrypt } = await import('../utils/crypto');
      settings.ldapBindPassword = encrypt(ldapBindPassword);
    }

    settings.updatedBy = req.user?._id;
    await settings.save();

    // Devolver objeto enmascarado al cliente
    const settingsObj = settings.toObject();
    if (settingsObj.azureClientSecret) settingsObj.azureClientSecret = '******';
    if (settingsObj.ldapBindPassword) settingsObj.ldapBindPassword = '******';

    res.json({
      success: true,
      data: settingsObj,
      message: 'Configuracion de seguridad actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando configuracion de seguridad:', error);
    res.status(400).json({ success: false, error: 'Error al actualizar configuracion de seguridad' });
  }
};

export const testAdSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      adProvider,
      azureTenantId,
      azureClientId,
      azureClientSecret,
      ldapUrl,
      ldapBaseDN,
      ldapBindDN,
      ldapBindPassword
    } = req.body;

    if (adProvider === 'azure') {
      if (!azureTenantId || !azureClientId || !azureClientSecret) {
        res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios de Azure AD.' });
        return;
      }
      
      // Validación básica de formato de UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(azureTenantId) || !uuidRegex.test(azureClientId)) {
        res.status(400).json({ success: false, error: 'El Tenant ID o Client ID no poseen un formato UUID válido.' });
        return;
      }

      res.json({ success: true, message: 'Parámetros de Azure AD validados correctamente (Simulación exitosa).' });
      return;
    }

    if (adProvider === 'ldap') {
      if (!ldapUrl || !ldapBaseDN || !ldapBindDN || !ldapBindPassword) {
        res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios de LDAP.' });
        return;
      }

      // Probar conectividad TCP básica hacia el puerto LDAP configurado de forma robusta
      try {
        const net = await import('net');
        let normalizedUrl = ldapUrl.trim();
        // Si no tiene esquema (ej. '127.0.0.1:389' o 'servidor.ldap'), añadimos 'ldap://' para el parser
        if (!/^ldaps?:\/\//i.test(normalizedUrl)) {
          normalizedUrl = 'ldap://' + normalizedUrl;
        }

        let host = '';
        let port = 389;

        try {
          // Reemplazamos ldap/ldaps por http/https para que el constructor de URL de JS no falle
          const url = new URL(normalizedUrl.replace(/^ldap:\/\//i, 'http://').replace(/^ldaps:\/\//i, 'https://'));
          host = url.hostname;
          port = Number(url.port) || (normalizedUrl.toLowerCase().startsWith('ldaps://') ? 636 : 389);
          if (!host) {
            throw new Error('El hostname de la URL de LDAP está vacío');
          }
        } catch (urlErr) {
          // Fallback en caso de que URL falle, intentamos extraer host y puerto de manera manual
          const cleanUrl = normalizedUrl.replace(/^ldaps?:\/\//i, '');
          const parts = cleanUrl.split(':');
          host = parts[0] || '';
          if (parts[1]) {
            port = Number(parts[1]);
          } else {
            port = normalizedUrl.toLowerCase().startsWith('ldaps://') ? 636 : 389;
          }
          if (!host) {
            throw new Error('La URL de LDAP ingresada no posee un host válido.');
          }
        }

        const checkSocket = new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(2500);

          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });

          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Tiempo de espera agotado al conectar al servidor LDAP.'));
          });

          socket.on('error', (err) => {
            socket.destroy();
            reject(err);
          });

          socket.connect(port, host);
        });

        await checkSocket;
      } catch (err: any) {
        res.status(400).json({
          success: false,
          error: `Error al conectar por TCP con el servidor LDAP: ${err.message}`
        });
        return;
      }

      res.json({ success: true, message: 'Conexión TCP establecida con el servidor LDAP exitosamente.' });
      return;
    }

    res.status(400).json({ success: false, error: 'Proveedor de Active Directory no soportado.' });
  } catch (error: any) {
    console.error('Error al probar configuración de AD:', error);
    res.status(500).json({ success: false, error: `Error durante la prueba de conexión: ${error.message}` });
  }
};

/**
 * Lista todos los archivos de respaldo locales disponibles en el disco del servidor.
 */
export const listLocalBackups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const backups = await getLocalBackupsList();
    res.json({
      success: true,
      data: backups
    });
  } catch (error: any) {
    console.error('Error al listar respaldos locales:', error);
    res.status(500).json({ success: false, error: 'Error al listar los respaldos locales' });
  }
};

/**
 * Genera de forma manual e inmediata un respaldo local en el servidor.
 */
export const createManualLocalBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = await runLocalBackup();
    
    // Registrar auditoría de creación de backup local
    await recordAuditLog({
      action: AuditAction.CREATE,
      resource: 'backup',
      resourceId: filename,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
      message: `Respaldo local creado manualmente con éxito: ${filename}`
    });

    res.json({
      success: true,
      data: { filename },
      message: 'Respaldo local generado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al crear respaldo local:', error);
    res.status(500).json({ success: false, error: 'Error al crear el respaldo local' });
  }
};

/**
 * Descarga un archivo de respaldo específico, validando contra Path Traversal.
 */
export const downloadLocalBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename;

    // Validar tipo del nombre de archivo y sanitizar contra Path Traversal
    if (typeof filename !== 'string' || !filename.startsWith('backup-') || !filename.endsWith('.zip') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, error: 'Nombre de archivo de respaldo inválido o inseguro.' });
      return;
    }

    const backupsDir = path.join(__dirname, '../../backups');
    const filePath = path.resolve(backupsDir, filename);

    // Asegurar que el archivo final resuelto se encuentre estrictamente dentro de backupsDir
    if (!filePath.startsWith(path.resolve(backupsDir))) {
      res.status(400).json({ success: false, error: 'Acceso denegado al archivo especificado.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'El archivo de respaldo solicitado no existe.' });
      return;
    }

    // Registrar auditoría de descarga de backup
    await recordAuditLog({
      action: AuditAction.DOWNLOAD,
      resource: 'backup',
      resourceId: filename,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
      message: `Descarga de respaldo local iniciada: ${filename}`
    });

    res.download(filePath, filename);
  } catch (error: any) {
    console.error('Error al descargar respaldo local:', error);
    res.status(500).json({ success: false, error: 'Error al descargar el respaldo local' });
  }
};

/**
 * Elimina manualmente un archivo de respaldo local del disco.
 */
export const deleteLocalBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename;

    // Validar tipo del nombre de archivo y sanitizar contra Path Traversal
    if (typeof filename !== 'string' || !filename.startsWith('backup-') || !filename.endsWith('.zip') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, error: 'Nombre de archivo de respaldo inválido.' });
      return;
    }

    const backupsDir = path.join(__dirname, '../../backups');
    const filePath = path.resolve(backupsDir, filename);

    // Validar ubicación física
    if (!filePath.startsWith(path.resolve(backupsDir))) {
      res.status(400).json({ success: false, error: 'Acceso denegado.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'El respaldo no existe.' });
      return;
    }

    // Eliminar físicamente el archivo
    fs.unlinkSync(filePath);

    // Registrar auditoría de eliminación exitosa
    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'backup',
      resourceId: filename,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
      message: `Respaldo local eliminado físicamente del servidor: ${filename}`
    });

    res.json({
      success: true,
      message: 'Respaldo local eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar respaldo local:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar el respaldo local' });
  }
};
