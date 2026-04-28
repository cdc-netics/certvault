import { Request, Response } from 'express';
import { AuditAction, AuditLog } from '../models/AuditLog';
import { BrandingSettings } from '../models/BrandingSettings';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { toSafeSmtpProfile } from '../services/smtpProfileService';

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
    const [users, certifications, smtpProfiles, branding] = await Promise.all([
      User.find().select('-password -refreshToken -passwordResetToken -verificationToken').lean(),
      Certification.find().lean(),
      SmtpProfile.find().select('+passwordEncrypted').lean(),
      BrandingSettings.findOne().sort({ updatedAt: -1 }).lean()
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      collections: {
        users,
        certifications,
        smtpProfiles: smtpProfiles.map(profile => ({
          ...profile,
          passwordEncrypted: profile.passwordEncrypted ? '[encrypted-secret-exported]' : undefined
        })),
        branding
      }
    };

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
      message: 'Backup exportado'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="certivault-backup-${Date.now()}.json"`);
    res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Error exportando backup:', error);
    res.status(500).json({ success: false, error: 'Error al exportar backup' });
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
