import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  Certification,
  ICertification,
  CertificationStatus
} from '../models/Certification';
import { AuthRequest } from '../middleware/auth';
import { User, UserRole } from '../models/User';

const canAccessCertification = (certification: ICertification, user: any): boolean => {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;

  const isOwner =
    certification.employeeId?.toString() === user._id?.toString() ||
    certification.createdBy?.toString() === user._id?.toString();

  if (isOwner) return true;

  // Un lider puede acceder a las certificaciones de su departamento o departamentos gestionados
  const isLeaderWithAccess =
    user.role === UserRole.LIDER &&
    (certification.department === user.department ||
      (user.managedDepartments || []).includes(certification.department as any));

  // Un usuario con rol de Solo Lectura (reader) puede acceder a leer las certificaciones de su mismo departamento
  const isReaderOfSameDepartment =
    user.role === UserRole.READER &&
    certification.department === user.department;

  return isLeaderWithAccess || isReaderOfSameDepartment;
};

const normalizeTags = (tags?: unknown): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => `${tag}`.trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Normaliza el nombre del emisor/plataforma de la certificación.
 * Realiza una búsqueda insensible a mayúsculas/minúsculas en la base de datos para reutilizar
 * el formato de la variante ya registrada (evitando duplicados como "beyondtrust" y "BeyondTrust").
 * Si no existe en la base de datos, se conserva el valor limpio y recortado tal como lo ingresó el usuario.
 */
const normalizeProviderName = async (providerName?: string): Promise<string> => {
  if (!providerName) return '';
  const trimmed = providerName.trim();
  const escaped = trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  const existing = await Certification.findOne({
    provider: { $regex: new RegExp(`^${escaped}$`, 'i') }
  }).select('provider').lean();

  return existing && existing.provider ? existing.provider : trimmed;
};

export const createCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    const providerNormalized = await normalizeProviderName(payload.provider);

    const certification = await Certification.create({
      title: payload.title,
      description: payload.description || '',
      type: payload.type,
      technology: payload.technology,
      provider: providerNormalized,
      level: payload.level,
      employeeId: payload.employeeId || req.user?._id,
      employeeName:
        payload.employeeName ||
        (req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Usuario'),
      department: payload.department || req.user?.department,
      issueDate: payload.issueDate,
      expirationDate: payload.expirationDate,
      certificateNumber: payload.certificateNumber,
      validationUrl: payload.validationUrl,
      tags: normalizeTags(payload.tags),
      status: payload.status || CertificationStatus.ACTIVE,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    } as Partial<ICertification>);

    res.status(201).json({ success: true, data: certification });
  } catch (error) {
    console.error('Error creating certification:', error);
    if (error instanceof Error && (error as any).name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error al crear la certificación'
      });
    }
  }
};

export const getCertifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limit = Math.max(parseInt((req.query.limit as string) || '10', 10), 1);
    const search = (req.query.search as string) || '';
    const filter: Record<string, unknown> = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.level) filter.level = req.query.level;
    if (req.query.provider) filter.provider = req.query.provider;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.status) filter.status = req.query.status;

    if (req.query.dateFrom || req.query.dateTo) {
      filter.issueDate = {};
      if (req.query.dateFrom) {
        (filter.issueDate as Record<string, unknown>).$gte = new Date(
          req.query.dateFrom as string
        );
      }
      if (req.query.dateTo) {
        (filter.issueDate as Record<string, unknown> as { $lte?: Date }).$lte = new Date(
          req.query.dateTo as string
        );
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { technology: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const authReq = req as any;
    const currentUser = authReq.user;
    const userFilter: Record<string, unknown> = {};

    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.LIDER)) {
      userFilter.isActive = true;
    } else if (currentUser.role === UserRole.LIDER) {
      const allowedDepartments = [currentUser.department, ...(currentUser.managedDepartments || [])];
      userFilter.$or = [
        { isActive: true },
        { isActive: false, department: { $in: allowedDepartments } }
      ];
    }

    if (Object.keys(userFilter).length > 0) {
      const visibleUsers = await User.find(userFilter, { _id: 1 }).lean();
      filter.employeeId = { $in: visibleUsers.map(user => user._id) };
    }

    const total = await Certification.countDocuments(filter);
    const certificationsRaw = await Certification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = certificationsRaw.map(c => c.employeeId);
    const users = await User.find({ _id: { $in: userIds } }, { _id: 1, isActive: 1, department: 1 }).lean();
    const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));

    let missingUserReferences = 0;

    const certifications = certificationsRaw.map(cert => {
      const user = userMap[cert.employeeId?.toString()];
      if (!user) {
        missingUserReferences += 1;
      }

      return {
        ...cert,
        // Solo marcar inactivo cuando existe usuario y esta explicitamente desactivado.
        // Si falta el usuario, reportar inconsistencia sin bloquear la certificacion como "No disponible".
        userIsActive: user ? user.isActive : undefined,
        userDepartment: user ? user.department : undefined,
        userReferenceMissing: !user
      };
    });

    if (missingUserReferences > 0) {
      console.warn(`Certificaciones con referencia de usuario faltante: ${missingUserReferences}`);
    }

    res.json({
      success: true,
      data: {
        certifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting certifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener certificaciones'
    });
  }
};

export const getPublicCertifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiClient = (req as any).publicApiClient;
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const requestedLimit = Math.max(parseInt((req.query.limit as string) || '20', 10), 1);
    const maxPageSize = Number(apiClient?.maxPageSize || 100);
    const limit = Math.min(requestedLimit, maxPageSize);
    const search = (req.query.search as string)?.trim();

    const certificationFilter: Record<string, unknown> = {};
    if (req.query.type) certificationFilter.type = req.query.type;
    if (req.query.level) certificationFilter.level = req.query.level;
    if (req.query.provider) certificationFilter.provider = req.query.provider;
    if (req.query.department) certificationFilter.department = req.query.department;
    if (req.query.status) certificationFilter.status = req.query.status;
    if (req.query.certificateNumber) certificationFilter.certificateNumber = req.query.certificateNumber;

    if (search) {
      certificationFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { technology: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { certificateNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline: any[] = [
      { $match: certificationFilter },
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
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          technology: 1,
          provider: 1,
          level: 1,
          employeeName: 1,
          department: 1,
          issueDate: 1,
          expirationDate: 1,
          certificateNumber: 1,
          status: 1,
          validationUrl: 1,
          hasCertificate: {
            $cond: [{ $ifNull: ['$certificateUrl', false] }, true, false]
          }
        }
      },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await Certification.aggregate(pipeline);
    const data = result?.data || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      success: true,
      data: {
        certifications: data,
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          totalItems: total,
          limit,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting public certifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener certificaciones publicas'
    });
  }
};

export const getCertificationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

    if (!canAccessCertification(certification, req.user)) {
      res.status(403).json({ success: false, error: 'No autorizado para acceder a esta certificación' });
      return;
    }

    res.json({ success: true, data: certification });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la certificación'
    });
  }
};

export const getCertificationFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

    if (!canAccessCertification(certification, req.user)) {
      res.status(403).json({ success: false, error: 'No autorizado para acceder a este archivo' });
      return;
    }

    const certificateUrl = certification.certificateUrl || '';
    if (!certificateUrl.startsWith('/uploads/certificates/')) {
      res.status(404).json({ success: false, error: 'Archivo de certificado no disponible' });
      return;
    }

    const fileName = path.basename(certificateUrl);
    const filePath = path.resolve(__dirname, '../../uploads/certificates', fileName);
    const uploadsRoot = path.resolve(__dirname, '../../uploads/certificates');
    const relativePath = path.relative(uploadsRoot, filePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Archivo de certificado no encontrado' });
      return;
    }

    const downloadName = `${certification.certificateNumber || certification.title || 'certificado'}${path.extname(fileName)}`;
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName.replace(/"/g, '')}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting certification file:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el archivo de certificación'
    });
  }
};

export const getPublicCertificationFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiClient = (req as any).publicApiClient;
    if (!apiClient?.canDownloadFiles) {
      res.status(403).json({ success: false, error: 'La API key no tiene permiso de descarga' });
      return;
    }

    const certification = await Certification.findById(req.params.id).lean();
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificacion no encontrada' });
      return;
    }

    const ownerUser = await User.findById(certification.employeeId, { _id: 1, isActive: 1 }).lean();
    if (!ownerUser || ownerUser.isActive === false) {
      res.status(404).json({ success: false, error: 'Archivo no disponible para esta certificacion' });
      return;
    }

    const certificateUrl = certification.certificateUrl || '';
    if (!certificateUrl.startsWith('/uploads/certificates/')) {
      res.status(404).json({ success: false, error: 'Archivo de certificado no disponible' });
      return;
    }

    const fileName = path.basename(certificateUrl);
    const filePath = path.resolve(__dirname, '../../uploads/certificates', fileName);
    const uploadsRoot = path.resolve(__dirname, '../../uploads/certificates');
    const relativePath = path.relative(uploadsRoot, filePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Archivo de certificado no encontrado' });
      return;
    }

    const downloadName = `${certification.certificateNumber || certification.title || 'certificado'}${path.extname(fileName)}`;
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName.replace(/"/g, '')}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting public certification file:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el archivo de certificacion' });
  }
};

export const updateCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Usuario no autenticado' });
      return;
    }

    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

    const isOwner =
      certification.employeeId?.toString() === req.user?._id?.toString() ||
      certification.createdBy?.toString() === req.user?._id?.toString();

    // Se restringe a los usuarios Solo Lectura (reader) de actualizar certificaciones ajenas de su departamento
    const isReader = req.user?.role === UserRole.READER;
    if (isReader && !isOwner) {
      res.status(403).json({
        success: false,
        error: 'Un usuario con rol de solo lectura no tiene permisos para actualizar certificaciones de otros colaboradores'
      });
      return;
    }

    if (!canAccessCertification(certification, req.user)) {
      res.status(403).json({
        success: false,
        error: 'Solo el propietario o el líder de su departamento pueden actualizar esta certificación'
      });
      return;
    }

    const updates = {
      ...req.body,
      tags: normalizeTags(req.body.tags),
      updatedBy: req.user?._id
    };

    // Normalizar el emisor/plataforma en caso de que venga en los datos a actualizar
    if (req.body.provider !== undefined) {
      updates.provider = await normalizeProviderName(req.body.provider);
    }

    const updated = await Certification.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la certificación'
    });
  }
};
export const deleteCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

    // Validar privilegios: solo el dueño, administradores o el líder de área pueden eliminar la certificación
    const isOwner =
      certification.employeeId?.toString() === req.user?._id?.toString() ||
      certification.createdBy?.toString() === req.user?._id?.toString();

    const isAdmin = req.user?.role === UserRole.ADMIN;
    const isLeaderOfSameDept =
      req.user?.role === UserRole.LIDER &&
      (certification.department === req.user.department ||
        (req.user.managedDepartments || []).includes(certification.department as any));

    if (!isOwner && !isAdmin && !isLeaderOfSameDept) {
      res.status(403).json({
        success: false,
        error: 'No tienes privilegios para eliminar esta certificación'
      });
      return;
    }

    await Certification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Certificación eliminada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la certificación'
    });
  }
};

export const getCertificationStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const total = await Certification.countDocuments();
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + 30);

    const [byStatusRaw, expiringSoonList, recentList] = await Promise.all([
      Certification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Certification.find({ expirationDate: { $lte: threshold, $gte: now } })
        .sort({ expirationDate: 1 })
        .limit(10),
      Certification.find().sort({ createdAt: -1 }).limit(10)
    ]);

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        recent: recentList,
        expiringSoon: expiringSoonList
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

export const getExpiringCertifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + days);

    const certifications = await Certification.find({
      expirationDate: { $lte: threshold, $gte: now }
    }).sort({ expirationDate: 1 });

    res.json({ success: true, data: certifications });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener certificaciones por expirar'
    });
  }
};

export const getUserCertifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const certifications = await Certification.find({ employeeId: req.params.userId }).sort({
      issueDate: -1
    });
    res.json({ success: true, data: certifications });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener certificaciones del usuario'
    });
  }
};

export const uploadCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se envió archivo' });
      return;
    }

    const fileUrl = `/uploads/certificates/${req.file.filename}`;

    await Certification.findByIdAndUpdate(req.params.id, { certificateUrl: fileUrl });

    res.json({ success: true, data: { url: fileUrl } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al subir el archivo'
    });
  }
};

export const searchCertifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) {
      res.json({ success: true, data: [] });
      return;
    }

    const regex = new RegExp(q, 'i');
    const certifications = await Certification.find({
      $or: [
        { title: regex },
        { employeeName: regex },
        { technology: regex },
        { provider: regex },
        { department: regex }
      ]
    }).limit(20);

    res.json({ success: true, data: certifications });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar certificaciones'
    });
  }
};

export const getTechnologies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const technologies = await Certification.distinct('technology');
    res.json({ success: true, data: technologies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener tecnologías'
    });
  }
};

export const getDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await Certification.distinct('department');
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener departamentos'
    });
  }
};

export const getProviders = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Retorna la lista única de proveedores de la base de datos
    const providers = await Certification.distinct('provider');
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores/emisores'
    });
  }
};




