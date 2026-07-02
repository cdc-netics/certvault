import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import {
  Certification,
  ICertification,
  CertificationStatus
} from '../models/Certification';
import { AuthRequest } from '../middleware/auth';
import { User, UserRole } from '../models/User';
import { Department } from '../models/Department';

const canAccessCertification = (certification: ICertification, user: any): boolean => {
  // Se permite el acceso de lectura y descarga de archivos a cualquier usuario autenticado en la plataforma.
  // Las restricciones de modificación y eliminación se evalúan de forma independiente en sus respectivos endpoints.
  return !!user;
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

const buildDepartmentCondition = async (rawDepartment?: string): Promise<Record<string, unknown> | null> => {
  if (!rawDepartment) return null;

  const normalized = rawDepartment.trim();
  if (!normalized) return null;

  // Compatibilidad: aceptar id de departamento y también nombre/código (por ejemplo "TI").
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    return {
      $or: [
        { department: new mongoose.Types.ObjectId(normalized) },
        // Se utiliza $toString sobre el campo department en la expresión para evadir la validación automática de esquema de Mongoose en Mongoose 8.x
        { $expr: { $eq: [{ $toString: '$department' }, normalized] } }
      ]
    };
  }

  const escaped = normalized.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const exactInsensitive = new RegExp(`^${escaped}$`, 'i');

  const matchingDepts = await Department.find({
    $or: [{ name: exactInsensitive }, { code: exactInsensitive }]
  })
    .select('_id')
    .lean();

  const departmentIds = matchingDepts.map((dept) => dept._id);

  // Fallback para datos legados donde department pudo quedar almacenado como string.
  // Se utiliza $toString sobre el campo department en la expresión para evadir la validación automática de esquema de Mongoose en Mongoose 8.x
  if (departmentIds.length === 0) {
    return { $expr: { $eq: [{ $toString: '$department' }, normalized] } };
  }

  return {
    $or: [
      { department: { $in: departmentIds } },
      { $expr: { $eq: [{ $toString: '$department' }, normalized] } }
    ]
  };
};

export const createCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    const providerNormalized = await normalizeProviderName(payload.provider);

    // Mejoras en RBAC: Validar privilegios para certificaciones organizacionales
    if (payload.isOrganizational) {
      if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.LIDER) {
        res.status(403).json({
          success: false,
          error: 'No tienes privilegios para crear certificaciones organizacionales (requiere rol de Administrador o Líder)'
        });
        return;
      }
    }

    const certificationData: Partial<ICertification> = {
      title: payload.title,
      description: payload.description || '',
      type: payload.type,
      technology: payload.technology,
      provider: providerNormalized,
      level: payload.level,
      issueDate: payload.issueDate,
      expirationDate: payload.expirationDate,
      certificateNumber: payload.certificateNumber,
      validationUrl: payload.validationUrl,
      tags: normalizeTags(payload.tags),
      status: payload.status || CertificationStatus.ACTIVE,
      isOrganizational: Boolean(payload.isOrganizational),
      applicableDepartments: payload.isOrganizational && Array.isArray(payload.applicableDepartments)
        ? payload.applicableDepartments.map((id: string) => new mongoose.Types.ObjectId(id))
        : [],
      appliesToAllCompany: payload.isOrganizational ? Boolean(payload.appliesToAllCompany) : false,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    };

    // Solo asignar campos individuales si no es una certificación organizacional
    if (!payload.isOrganizational) {
      certificationData.employeeId = payload.employeeId || req.user?._id;
      certificationData.employeeName =
        payload.employeeName ||
        (req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Usuario');
      certificationData.department = payload.department || req.user?.department;
    }

    const certification = await Certification.create(certificationData);

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
    const filter: any = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.level) filter.level = req.query.level;
    if (req.query.provider) {
      const escaped = (req.query.provider as string).trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.provider = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
    const departmentCondition = await buildDepartmentCondition(req.query.department as string | undefined);
    if (departmentCondition) {
      filter.$and = filter.$and || [];
      filter.$and.push(departmentCondition);
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.employeeId) {
      const employeeId = (req.query.employeeId as string).trim();
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        res.status(400).json({
          success: false,
          error: 'employeeId invalido'
        });
        return;
      }
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

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
      // Se escapan caracteres especiales para prevenir ataques de inyección de expresiones regulares (ReDoS)
      const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // Buscar IDs de departamentos que coincidan con el término de búsqueda
      const matchingDepts = await Department.find({
        name: { $regex: escapedSearch, $options: 'i' }
      }).select('_id').lean();
      const matchingDeptIds = matchingDepts.map(d => d._id);

      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { employeeName: { $regex: escapedSearch, $options: 'i' } },
        { technology: { $regex: escapedSearch, $options: 'i' } },
        { provider: { $regex: escapedSearch, $options: 'i' } }
      ];

      if (matchingDeptIds.length > 0) {
        filter.$or.push({ department: { $in: matchingDeptIds } });
      }
    }

    const authReq = req as any;
    const currentUser = authReq.user;
    const userFilter: Record<string, unknown> = {};

    // Mejoras en RBAC: Los administradores y líderes tienen acceso global de lectura.
    // Solo limitamos a usuarios activos si el usuario es READER o TECNICO.
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.LIDER)) {
      userFilter.isActive = true;

      // Si el usuario no tiene privilegios de lectura global (no es líder ni admin), se fuerza la restricción a su propio departamento
      if (currentUser && currentUser.department && currentUser.role !== UserRole.READER) {
        const userDeptId = currentUser.department._id || currentUser.department;
        
        // Se limita la búsqueda de colaboradores del backend al mismo departamento
        userFilter.department = userDeptId;

        // Se limpia cualquier condición de departamento que provenga de query params previos
        filter.$and = filter.$and || [];
        filter.$and = filter.$and.filter((cond: any) => {
          return !cond.$or || !cond.$or.some((o: any) => o.department !== undefined || (o.$expr && JSON.stringify(o.$expr).includes('department')));
        });

        // Se inyecta la restricción del departamento correspondiente al usuario actual
        filter.$and.push({
          $or: [
            { department: userDeptId },
            {
              isOrganizational: true,
              $or: [
                { appliesToAllCompany: true },
                { applicableDepartments: userDeptId }
              ]
            }
          ]
        });
      }
    }

    if (Object.keys(userFilter).length > 0) {
      const visibleUsers = await User.find(userFilter, { _id: 1 }).lean();
      const visibleUserIds = visibleUsers.map(user => user._id);
      
      // Permitir certificaciones asignadas a usuarios visibles O que sean organizacionales (sin colaborador)
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { employeeId: { $in: visibleUserIds } },
          { isOrganizational: true }
        ]
      });
    }

    const total = await Certification.countDocuments(filter);
    
    // Configurar orden dinámico. El orden predeterminado prioriza el vencimiento más cercano.
    const sortBy = (req.query.sortBy as string) || 'expirationDate';
    const sortOrder = (req.query.sortOrder as string) === 'desc' ? -1 : 1;
    const sortObj: any = {};
    if (sortBy === 'expirationDate') {
      sortObj.expirationDate = sortOrder; // 1 para vencimiento más próximo primero
      sortObj.createdAt = -1;             // Orden secundario por fecha de creación desc
    } else {
      sortObj[sortBy] = sortOrder;
    }

    const certificationsRaw = await Certification.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = certificationsRaw.map(c => c.employeeId);
    const users = await User.find({ _id: { $in: userIds } }, { _id: 1, isActive: 1, department: 1 }).lean();
    const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));

    let missingUserReferences = 0;

    const certifications = certificationsRaw.map(cert => {
      const user = cert.employeeId ? userMap[cert.employeeId.toString()] : undefined;
      
      // No contar como referencia faltante si es una certificación de tipo organizacional
      if (!user && !cert.isOrganizational) {
        missingUserReferences += 1;
      }

      return {
        ...cert,
        userIsActive: user ? user.isActive : undefined,
        userDepartment: user ? user.department : undefined,
        userReferenceMissing: !user && !cert.isOrganizational
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
    if (req.query.provider) {
      const escaped = (req.query.provider as string).trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      certificationFilter.provider = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
    const departmentCondition = await buildDepartmentCondition(req.query.department as string | undefined);
    if (departmentCondition) {
      certificationFilter.$and = certificationFilter.$and || [];
      (certificationFilter.$and as any[]).push(departmentCondition);
    }
    if (req.query.status) certificationFilter.status = req.query.status;
    if (req.query.certificateNumber) certificationFilter.certificateNumber = req.query.certificateNumber;

    if (search) {
      // Se escapan caracteres especiales para prevenir ataques de inyección de expresiones regulares (ReDoS)
      const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      certificationFilter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { employeeName: { $regex: escapedSearch, $options: 'i' } },
        { technology: { $regex: escapedSearch, $options: 'i' } },
        { provider: { $regex: escapedSearch, $options: 'i' } },
        { certificateNumber: { $regex: escapedSearch, $options: 'i' } }
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

    // Mejoras en RBAC: Restringir la descarga física de certificaciones organizacionales
    if (certification.isOrganizational) {
      const userDeptId = req.user?.department?._id ? req.user.department._id.toString() : req.user?.department?.toString();
      
      const isUserInApplicableDept = certification.appliesToAllCompany || 
        certification.applicableDepartments?.some((d: any) => {
          const dId = d?._id ? d._id.toString() : d.toString();
          return dId === userDeptId;
        }) ||
        (req.user?.managedDepartments || []).some((md: any) => {
          const mdId = md?._id ? md._id.toString() : md.toString();
          return certification.applicableDepartments?.some((ad: any) => {
            const adId = ad?._id ? ad._id.toString() : ad.toString();
            return adId === mdId;
          });
        });

      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isCreator = certification.createdBy?.toString() === req.user?._id?.toString();

      if (!isAdmin && !isCreator && !isUserInApplicableDept) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para descargar el archivo de esta certificación organizacional (acceso restringido a áreas aplicables)'
        });
        return;
      }
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

    const isAdmin = req.user?.role === UserRole.ADMIN;
    const isLeaderOfSameDept =
      req.user?.role === UserRole.LIDER &&
      certification.department &&
      (certification.department.toString() === req.user.department?.toString() ||
        (req.user.managedDepartments || []).some((d: any) => d.toString() === certification.department?.toString()));

    // ISS-015: Las certificaciones organizacionales de Compliance pueden ser editadas por cualquier líder
    const isComplianceOrg = 
      (certification.type === 'compliance' || req.body.type === 'compliance') &&
      (certification.isOrganizational || req.body.isOrganizational);
    
    const canLeaderEditCompliance = req.user?.role === UserRole.LIDER && isComplianceOrg;

    // Se restringe a los usuarios Solo Lectura (reader) de actualizar certificaciones ajenas
    const isReader = req.user?.role === UserRole.READER;
    if (isReader && !isOwner) {
      res.status(403).json({
        success: false,
        error: 'Un usuario con rol de solo lectura no tiene permisos para actualizar certificaciones ajenas'
      });
      return;
    }

    // Validar si intenta cambiar o definir algo organizacional
    if (req.body.isOrganizational) {
      if (!isAdmin && req.user?.role !== UserRole.LIDER) {
        res.status(403).json({
          success: false,
          error: 'Solo Administradores o Líderes de área pueden definir certificaciones organizacionales'
        });
        return;
      }
    }

    // Validar privilegios de edición: solo el dueño, administradores, líderes de su área o líderes sobre compliance org
    if (!isOwner && !isAdmin && !isLeaderOfSameDept && !canLeaderEditCompliance) {
      res.status(403).json({
        success: false,
        error: 'No tienes privilegios para actualizar esta certificación'
      });
      return;
    }

    const updates = {
      ...req.body,
      tags: normalizeTags(req.body.tags),
      updatedBy: req.user?._id
    };

    // Si se marca como organizacional, limpiar campos individuales
    if (req.body.isOrganizational !== undefined) {
      updates.isOrganizational = Boolean(req.body.isOrganizational);
      if (updates.isOrganizational) {
        updates.employeeId = null;
        updates.employeeName = null;
        updates.department = null;
        updates.applicableDepartments = Array.isArray(req.body.applicableDepartments)
          ? req.body.applicableDepartments.map((id: string) => new mongoose.Types.ObjectId(id))
          : [];
        updates.appliesToAllCompany = Boolean(req.body.appliesToAllCompany);
      }
    }

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

    // Validar privilegios: solo el dueño, administradores o el líder de área pueden eliminar la certificación.
    // ISS-015: Para certificaciones organizacionales, solo el creador original y el Administrador pueden eliminar.
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const isOwner =
      certification.employeeId?.toString() === req.user?._id?.toString() ||
      certification.createdBy?.toString() === req.user?._id?.toString();

    if (certification.isOrganizational) {
      const isCreator = certification.createdBy?.toString() === req.user?._id?.toString();
      if (!isAdmin && !isCreator) {
        res.status(403).json({
          success: false,
          error: 'La eliminación de certificaciones organizacionales está restringida exclusivamente al Administrador y al Creador de la certificación'
        });
        return;
      }
    } else {
      const isLeaderOfSameDept =
        req.user?.role === UserRole.LIDER &&
        certification.department &&
        (certification.department.toString() === req.user.department?.toString() ||
          (req.user.managedDepartments || []).some((d: any) => d.toString() === certification.department?.toString()));

      if (!isOwner && !isAdmin && !isLeaderOfSameDept) {
        res.status(403).json({
          success: false,
          error: 'No tienes privilegios para eliminar esta certificación'
        });
        return;
      }
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
    const userId = typeof req.params.userId === 'string' ? req.params.userId : '';
    if (!userId) {
      res.status(400).json({ success: false, error: 'ID de usuario inválido' });
      return;
    }

    const queryConditions: any[] = [{ employeeId: userId }];

    if (mongoose.Types.ObjectId.isValid(userId)) {
      queryConditions.push({ employeeId: new mongoose.Types.ObjectId(userId) });
    }

    const certifications = await Certification.find({
      $or: queryConditions
    }).sort({
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

export const downloadAllUserCertifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const userId = typeof req.params.userId === 'string' ? req.params.userId : '';
    if (!userId) {
      res.status(400).json({ success: false, error: 'ID de usuario inválido' });
      return;
    }

    // Validar permisos del solicitante (propietario, admin o líder de su departamento)
    const isSelf = currentUser._id?.toString() === userId;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    let isLeaderWithAccess = false;

    if (currentUser.role === UserRole.LIDER) {
      const employee = await User.findById(userId);
      if (employee) {
        isLeaderWithAccess = currentUser.canManageDepartment(employee.department);
      }
    }

    if (!isSelf && !isAdmin && !isLeaderWithAccess) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para descargar las certificaciones de este usuario'
      });
      return;
    }

    // Buscar certificaciones del usuario que tengan un archivo asignado
    const queryConditions: any[] = [{ employeeId: userId }];
    if (mongoose.Types.ObjectId.isValid(userId)) {
      queryConditions.push({ employeeId: new mongoose.Types.ObjectId(userId) });
    }

    const certifications = await Certification.find({
      $or: queryConditions,
      certificateUrl: { $exists: true, $nin: [null, ''] }
    });

    if (!certifications || certifications.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No se encontraron archivos de certificaciones disponibles para este usuario'
      });
      return;
    }

    const zip = new AdmZip();
    const uploadsRoot = path.resolve(__dirname, '../../uploads/certificates');
    const addedNames = new Set<string>();

    for (const cert of certifications) {
      const certificateUrl = cert.certificateUrl || '';
      if (!certificateUrl.startsWith('/uploads/certificates/')) {
        continue;
      }

      const fileName = path.basename(certificateUrl);
      const filePath = path.resolve(uploadsRoot, fileName);

      // Comprobar existencia y evitar path traversal
      const relativePath = path.relative(uploadsRoot, filePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath)) {
        continue;
      }

      // Generar nombre descriptivo y seguro para el archivo en el ZIP
      let baseZipName = `${cert.certificateNumber || cert.title || 'certificado'}`;
      baseZipName = baseZipName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = path.extname(fileName);
      let zipEntryName = `${baseZipName}${ext}`;

      // Manejar nombres duplicados agregando un índice incremental
      let counter = 1;
      while (addedNames.has(zipEntryName)) {
        zipEntryName = `${baseZipName}_${counter}${ext}`;
        counter++;
      }
      addedNames.add(zipEntryName);

      // Agregar archivo al ZIP
      zip.addLocalFile(filePath, undefined, zipEntryName);
    }

    if (zip.getEntries().length === 0) {
      res.status(404).json({
        success: false,
        error: 'Los archivos de las certificaciones no están físicamente en el servidor'
      });
      return;
    }

    // Obtener datos del empleado para nombrar el archivo comprimido
    const targetUser = await User.findById(userId);
    const userSuffix = targetUser ? `${targetUser.firstName}_${targetUser.lastName}`.replace(/\s+/g, '_') : userId;

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="certificaciones_${userSuffix}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error al empaquetar certificaciones en ZIP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar la descarga consolidada en ZIP'
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

    // Se escapan caracteres especiales de expresiones regulares para evitar inyección y caídas del backend
    const escapedQ = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQ, 'i');

    const matchingDepts = await Department.find({
      name: regex
    }).select('_id').lean();
    const matchingDeptIds = matchingDepts.map(d => d._id);

    const searchConditions: any[] = [
      { title: regex },
      { employeeName: regex },
      { technology: regex },
      { provider: regex }
    ];

    if (matchingDeptIds.length > 0) {
      searchConditions.push({ department: { $in: matchingDeptIds } });
    }

    const certifications = await Certification.find({
      $or: searchConditions
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
    const departments = await Department.find({ isActive: true }).select('name').lean();
    const names = departments
      .map((dept) => (dept.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.json({ success: true, data: names });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener departamentos'
    });
  }
};

export const getProviders = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Retorna la lista única de proveedores de la base de datos normalizada case-insensitive
    const rawProviders = await Certification.distinct('provider');
    
    const normalizedSet = new Set<string>();
    const seenLower = new Set<string>();
    
    for (const provider of rawProviders) {
      if (!provider) continue;
      const trimmed = provider.trim();
      const lower = trimmed.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        normalizedSet.add(trimmed);
      }
    }
    
    res.json({ success: true, data: Array.from(normalizedSet) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores/emisores'
    });
  }
};




