import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  Certification,
  ICertification,
  CertificationStatus
} from '../models/Certification';
import { AuthRequest } from '../middleware/auth';


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

export const createCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    const certification = await Certification.create({
      title: payload.title,
      description: payload.description || '',
      type: payload.type,
      technology: payload.technology,
      provider: payload.provider,
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

    const total = await Certification.countDocuments(filter);
    const certifications = await Certification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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

export const getCertificationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
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
      certification.employeeId?.toString() === req.user._id?.toString() ||
      certification.createdBy?.toString() === req.user._id?.toString();


    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Solo el propietario puede actualizar esta certificación'
      });
      return;
    }

    const updates = {
      ...req.body,
      tags: normalizeTags(req.body.tags),
      updatedBy: req.user?._id
    };

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
      error: 'Error al actualizar la certificación'
    });
  }
};
export const deleteCertification = async (req: Request, res: Response): Promise<void> => {
  try {
    const certification = await Certification.findByIdAndDelete(req.params.id);
    if (!certification) {
      res.status(404).json({ success: false, error: 'Certificación no encontrada' });
      return;
    }

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



