import { Response } from 'express';
import mongoose from 'mongoose';
import { Department } from '../models/Department';
import { User, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { AuditAction } from '../models/AuditLog';
import { Certification } from '../models/Certification';

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

// Helper para realizar el borrado en cascada seguro del departamento
export const performDepartmentCascading = async (deptId: mongoose.Types.ObjectId): Promise<void> => {
  // 1. Usuarios: Limpiar el departamento del usuario
  await User.updateMany({ department: deptId }, { $set: { department: null as any } });

  // 2. Líderes: Remover del array de managedDepartments y degradar si corresponde
  const leaders = await User.find({ managedDepartments: deptId });
  for (const leader of leaders) {
    if (leader.managedDepartments) {
      leader.managedDepartments = leader.managedDepartments.filter(
        d => d.toString() !== deptId.toString()
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

  // 3. Certificaciones individuales: Poner department en null
  await Certification.updateMany({ department: deptId }, { $set: { department: null as any } });

  // 4. Certificaciones organizacionales: Sacar de la lista de departments aplicables
  await Certification.updateMany(
    { applicableDepartments: deptId },
    { $pull: { applicableDepartments: deptId } }
  );
};

// Eliminar departamento (Borrado Físico Real con Cascada)
export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);

    if (!dept) {
      res.status(404).json({ success: false, error: 'Departamento no encontrado' });
      return;
    }

    // Ejecutar borrado en cascada seguro
    await performDepartmentCascading(dept._id as mongoose.Types.ObjectId);

    // Borrado físico
    await Department.findByIdAndDelete(dept._id);

    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'departments',
      resourceId: dept._id.toString(),
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Eliminado físicamente el departamento ${dept.name} (${dept.code})`
    });

    res.json({
      success: true,
      message: 'Departamento eliminado permanentemente'
    });
  } catch (error) {
    console.error('Error al eliminar departamento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar departamento' });
  }
};

// Eliminar departamentos en lote (Masivo)
export const bulkDeleteDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Lista de IDs de departamentos requerida' });
      return;
    }

    let deletedCount = 0;
    for (const id of ids) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const deptId = new mongoose.Types.ObjectId(id);
        const dept = await Department.findById(deptId);
        if (dept) {
          await performDepartmentCascading(deptId);
          await Department.findByIdAndDelete(deptId);
          deletedCount++;
        }
      }
    }

    await recordAuditLog({
      action: AuditAction.DELETE,
      resource: 'departments',
      resourceId: 'bulk',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Eliminados físicamente ${deletedCount} departamentos en lote`
    });

    res.json({
      success: true,
      message: `Se eliminaron permanentemente ${deletedCount} departamentos`
    });
  } catch (error) {
    console.error('Error al eliminar departamentos en lote:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar departamentos en lote' });
  }
};

// Inactivar departamentos en lote (Masivo)
export const bulkInactivateDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Lista de IDs de departamentos requerida' });
      return;
    }

    let inactivatedCount = 0;
    for (const id of ids) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const deptId = new mongoose.Types.ObjectId(id);
        const dept = await Department.findById(deptId);
        if (dept && dept.isActive) {
          dept.isActive = false;
          
          // Desasociar líder de forma bidireccional si existía
          if (dept.leaderId) {
            const leader = await User.findById(dept.leaderId);
            if (leader) {
              if (leader.managedDepartments) {
                leader.managedDepartments = leader.managedDepartments.filter(
                  d => d.toString() !== deptId.toString()
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
          }
          
          await dept.save();
          inactivatedCount++;
        }
      }
    }

    await recordAuditLog({
      action: AuditAction.UPDATE,
      resource: 'departments',
      resourceId: 'bulk',
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      message: `Inactivados ${inactivatedCount} departamentos en lote`
    });

    res.json({
      success: true,
      message: `Se inactivaron ${inactivatedCount} departamentos`
    });
  } catch (error) {
    console.error('Error al inactivar departamentos en lote:', error);
    res.status(500).json({ success: false, error: 'Error al inactivar departamentos en lote' });
  }
};
