import { Response } from 'express';
import { Position } from '../models/Position';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { AuditAction } from '../models/AuditLog';
import { logger } from '../config/logger';

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
    logger.error('Error al obtener cargos:', error);
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
    logger.error('Error al crear cargo:', error);
    res.status(500).json({ success: false, error: 'Error al crear cargo' });
  }
};

// Actualizar cargo existente
export const updatePosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const position = await Position.findById(id);
    if (!position) {
      res.status(404).json({ success: false, error: 'Cargo no encontrado' });
      return;
    }

    // Si se provee nombre y es diferente al actual, verificar duplicidad
    if (name && name.trim() !== position.name) {
      const existing = await Position.findOne({
        _id: { $ne: position._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        res.status(400).json({ success: false, error: 'Ya existe otro cargo con ese nombre' });
        return;
      }
      position.name = name.trim();
    }

    // Actualizar estado de actividad si viene definido
    if (isActive !== undefined) {
      position.isActive = isActive;
    }

    await position.save();

    // Registrar en auditoría
    await recordAuditLog({
      action: AuditAction.UPDATE,
      resource: 'positions',
      resourceId: position._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Actualizado el cargo ${position.name} (Activo: ${position.isActive})`
    });

    res.json({
      success: true,
      data: position,
      message: 'Cargo actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error al actualizar cargo:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cargo' });
  }
};

// Eliminar cargo físicamente y limpiar la referencia en usuarios
export const deletePosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const position = await Position.findById(id);

    if (!position) {
      res.status(404).json({ success: false, error: 'Cargo no encontrado' });
      return;
    }

    // Limpiar la referencia a este cargo en los usuarios del sistema
    await User.updateMany({ position: id }, { $set: { position: null as any } });

    // Borrado físico
    await Position.findByIdAndDelete(position._id);

    // Registrar auditoría
    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'positions',
      resourceId: position._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Eliminado permanentemente el cargo ${position.name}`
    });

    res.json({
      success: true,
      message: 'Cargo eliminado permanentemente'
    });
  } catch (error) {
    logger.error('Error al eliminar cargo:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar cargo' });
  }
};

