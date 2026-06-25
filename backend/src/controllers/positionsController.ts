import { Response } from 'express';
import { Position } from '../models/Position';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { AuditAction } from '../models/AuditLog';

// Obtener todos los cargos
export const getPositions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activeOnly } = req.query;
    const filter: any = {};

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const positions = await Position.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('Error al obtener cargos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cargos' });
  }
};

// Crear nuevo cargo
export const createPosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'El nombre del cargo es requerido' });
      return;
    }

    const existing = await Position.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Ya existe un cargo con ese nombre' });
      return;
    }

    const newPos = new Position({
      name: name.trim(),
      isActive: true
    });

    await newPos.save();

    await recordAuditLog({
      action: AuditAction.CREATE,
      resource: 'positions',
      resourceId: newPos._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Creado el cargo ${newPos.name}`
    });

    res.status(201).json({
      success: true,
      data: newPos,
      message: 'Cargo creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear cargo:', error);
    res.status(500).json({ success: false, error: 'Error al crear cargo' });
  }
};
