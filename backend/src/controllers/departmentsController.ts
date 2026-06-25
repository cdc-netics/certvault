import { Response } from 'express';
import mongoose from 'mongoose';
import { Department } from '../models/Department';
import { User, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { AuditAction } from '../models/AuditLog';

// Helper para generar el código del departamento
const generateCode = async (name: string): Promise<string> => {
  const baseCode = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Eliminar caracteres especiales
    .substring(0, 4);

  let code = baseCode || 'DEPT';
  let counter = 1;
  while (await Department.findOne({ code })) {
    code = `${baseCode}${counter}`;
    counter++;
  }
  return code;
};

// Obtener todos los departamentos
export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activeOnly } = req.query;
    const filter: any = {};

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const departments = await Department.find(filter)
      .populate('leaderId', 'firstName lastName email username')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener departamentos' });
  }
};

// Obtener departamento por ID
export const getDepartmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id).populate('leaderId', 'firstName lastName email username');

    if (!department) {
      res.status(404).json({ success: false, error: 'Departamento no encontrado' });
      return;
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error al obtener departamento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el departamento' });
  }
};

// Crear nuevo departamento
export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, leaderId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'El nombre del departamento es requerido' });
      return;
    }

    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Ya existe un departamento con ese nombre' });
      return;
    }

    const code = await generateCode(name);
    
    const newDept = new Department({
      name: name.trim(),
      code,
      leaderId: leaderId ? new mongoose.Types.ObjectId(leaderId) : null,
      isActive: true
    });

    await newDept.save();

    // Lógica bidireccional si se asigna un líder de forma inmediata
    if (leaderId) {
      const leader = await User.findById(leaderId);
      if (leader) {
        if (leader.role !== UserRole.ADMIN) {
          leader.role = UserRole.LIDER;
          leader.departmentLeader = true;
        }
        if (!leader.managedDepartments) {
          leader.managedDepartments = [];
        }
        if (!leader.managedDepartments.some(d => d.toString() === newDept._id.toString())) {
          leader.managedDepartments.push(newDept._id as any);
        }
        // También actualizar el departamento principal del líder si es necesario
        // leader.department = newDept._id;
        await leader.save();
      }
    }

    await recordAuditLog({
      action: AuditAction.CREATE,
      resource: 'departments',
      resourceId: newDept._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Creado el departamento ${newDept.name} (${newDept.code})`
    });

    res.status(201).json({
      success: true,
      data: newDept,
      message: 'Departamento creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear departamento:', error);
    res.status(500).json({ success: false, error: 'Error al crear departamento' });
  }
};

// Actualizar departamento
export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, leaderId, isActive } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      res.status(404).json({ success: false, error: 'Departamento no encontrado' });
      return;
    }

    const oldLeaderId = dept.leaderId?.toString();
    const newLeaderId = leaderId ? leaderId.toString() : null;

    if (name && name.trim() !== dept.name) {
      const existing = await Department.findOne({
        _id: { $ne: dept._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        res.status(400).json({ success: false, error: 'Ya existe otro departamento con ese nombre' });
        return;
      }
      dept.name = name.trim();
    }

    if (isActive !== undefined) {
      dept.isActive = isActive;
    }

    dept.leaderId = leaderId ? new mongoose.Types.ObjectId(leaderId) : null as any;
    await dept.save();

    // Lógica bidireccional para desasociar al líder anterior si cambió
    if (oldLeaderId && oldLeaderId !== newLeaderId) {
      const oldLeader = await User.findById(oldLeaderId);
      if (oldLeader) {
        if (oldLeader.managedDepartments) {
          oldLeader.managedDepartments = oldLeader.managedDepartments.filter(
            d => d.toString() !== dept._id.toString()
          );
        }
        // Si ya no gestiona ningún departamento, remover rol de líder
        if (!oldLeader.managedDepartments || oldLeader.managedDepartments.length === 0) {
          oldLeader.departmentLeader = false;
          if (oldLeader.role === UserRole.LIDER) {
            oldLeader.role = UserRole.READER; // degradar a lector por defecto
          }
        }
        await oldLeader.save();
      }
    }

    // Lógica bidireccional para asociar al nuevo líder
    if (newLeaderId && oldLeaderId !== newLeaderId) {
      const newLeader = await User.findById(newLeaderId);
      if (newLeader) {
        if (newLeader.role !== UserRole.ADMIN) {
          newLeader.role = UserRole.LIDER;
          newLeader.departmentLeader = true;
        }
        if (!newLeader.managedDepartments) {
          newLeader.managedDepartments = [];
        }
        if (!newLeader.managedDepartments.some(d => d.toString() === dept._id.toString())) {
          newLeader.managedDepartments.push(dept._id as any);
        }
        await newLeader.save();
      }
    }

    await recordAuditLog({
      action: AuditAction.UPDATE,
      resource: 'departments',
      resourceId: dept._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Actualizado el departamento ${dept.name}`
    });

    res.json({
      success: true,
      data: dept,
      message: 'Departamento actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar departamento:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar departamento' });
  }
};

// Inactivar/Eliminar departamento
export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);

    if (!dept) {
      res.status(404).json({ success: false, error: 'Departamento no encontrado' });
      return;
    }

    // En lugar de borrar físicamente, se inactiva el departamento
    dept.isActive = false;
    await dept.save();

    // Desasociar líder si existía
    if (dept.leaderId) {
      const leader = await User.findById(dept.leaderId);
      if (leader) {
        if (leader.managedDepartments) {
          leader.managedDepartments = leader.managedDepartments.filter(
            d => d.toString() !== dept._id.toString()
          );
        }
        if (!leader.managedDepartments || leader.managedDepartments.length === 0) {
          leader.departmentLeader = false;
          if (leader.role === UserRole.LIDER) {
            leader.role = UserRole.READER;
          }
        }
        await leader.save();
      }
      dept.leaderId = undefined;
      await dept.save();
    }

    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'departments',
      resourceId: dept._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Inactivado el departamento ${dept.name}`
    });

    res.json({
      success: true,
      message: 'Departamento inactivado correctamente'
    });
  } catch (error) {
    console.error('Error al inactivar departamento:', error);
    res.status(500).json({ success: false, error: 'Error al inactivar departamento' });
  }
};
