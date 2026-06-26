import crypto from 'crypto';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { User, UserRole, Permission } from '../models/User';
import { Certification } from '../models/Certification';
import { AuthRequest } from '../middleware/auth';
import { saveBase64Avatar } from '../utils/avatar';
import { sendVerificationEmail, sendUserCertificationsArchiveEmail } from '../services/emailService';
import { recordAuditLog } from '../services/auditService';
import { AuditAction } from '../models/AuditLog';
import { resolveDepartment, resolvePosition } from '../utils/resolveEntities';
import { Department } from '../models/Department';
import { getResolvedServerPolicy } from '../services/serverPolicyService';

interface CreateUserRequest {
  username: string;
  email: string;
  personalEmail: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: any;
  position: any;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  departmentLeader?: boolean;
  managedDepartments?: any[];
  permissions?: Permission[];
}

interface UpdateUserRequest {
  username?: string;
  email?: string;
  personalEmail?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  department?: any;
  position?: any;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  isActive?: boolean;
  departmentLeader?: boolean;
  managedDepartments?: any[];
  permissions?: Permission[];
  password?: string;
}

interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  department?: any;
  isActive?: boolean | string;
  departmentLeader?: boolean | string;
}

const VERIFY_TOKEN_EXP_MINUTES = Number(process.env.VERIFY_EMAIL_EXPIRE_MINUTES || 60);

const getFrontendBaseUrl = (): string => {
  const base = process.env.FRONTEND_URL?.trim();
  if (!base) {
    throw new Error('FRONTEND_URL no esta definido en variables de entorno');
  }
  return base.replace(/\/$/, '');
};

const buildVerifyLink = (token: string, email: string): string => {
  const base = getFrontendBaseUrl();
  return `${base}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { page = 1, limit = 10, search, role, department, isActive, departmentLeader }: UsersQuery =
      req.query;

    if (!currentUser.hasPermission(Permission.READ_USERS)) {
      res.status(403).json({ success: false, error: 'No tienes permisos para ver usuarios' });
      return;
    }

    const filter: any = {};

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department?._id || currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments.map((d: any) => d._id || d));
      }
      filter.department = { $in: allowedDepartments };
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }
    if (departmentLeader !== undefined) {
      filter.departmentLeader = departmentLeader === 'true' || departmentLeader === true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email')
      .populate('department')
      .populate('managedDepartments')
      .populate('position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalUsers: total,
          hasNextPage: Number(page) * Number(limit) < total,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    if (!currentUser.hasPermission(Permission.READ_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver usuarios'
      });
      return;
    }

    const user = await User.findById(id)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email')
      .populate('department')
      .populate('managedDepartments')
      .populate('position');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const myDeptId = currentUser.department?._id ? currentUser.department._id.toString() : currentUser.department?.toString();
      const userDeptId = user.department?._id ? user.department._id.toString() : user.department?.toString();
      
      const allowedDeptIds = [myDeptId];
      if (currentUser.managedDepartments) {
        allowedDeptIds.push(...currentUser.managedDepartments.map((d: any) => d._id ? d._id.toString() : d.toString()));
      }

      if (!allowedDeptIds.includes(userDeptId)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver este usuario'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const userData: CreateUserRequest = req.body;

    if (!currentUser.hasPermission(Permission.CREATE_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para crear usuarios'
      });
      return;
    }

    // Resolver al vuelo departamento y cargo
    const resolvedDeptId = await resolveDepartment(userData.department as any);
    const resolvedPosId = await resolvePosition(userData.position || 'Colaborador');

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const myDeptId = currentUser.department?._id ? currentUser.department._id.toString() : currentUser.department?.toString();
      const targetDeptId = resolvedDeptId.toString();

      const allowedDeptIds = [myDeptId];
      if (currentUser.managedDepartments) {
        allowedDeptIds.push(...currentUser.managedDepartments.map((d: any) => d._id ? d._id.toString() : d.toString()));
      }

      if (!allowedDeptIds.includes(targetDeptId)) {
        res.status(403).json({
          success: false,
          error: 'No puedes crear usuarios en este departamento'
        });
        return;
      }

      if ([UserRole.ADMIN, UserRole.LIDER].includes(userData.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para crear usuarios con este rol'
        });
        return;
      }
    }

    const { requirePersonalEmail } = await getResolvedServerPolicy();

    if (requirePersonalEmail && (!userData.personalEmail || !userData.personalEmail.trim())) {
      res.status(400).json({
        success: false,
        error: 'El correo personal es requerido'
      });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email: userData.email.toLowerCase() }, { username: userData.username }]
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'El email o nombre de usuario ya existe'
      });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const newUser = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      personalEmail: userData.personalEmail ? userData.personalEmail.toLowerCase().trim() : undefined,
      department: resolvedDeptId,
      position: resolvedPosId,
      isVerified: false,
      verificationToken: hashedVerificationToken,
      verificationExpires: new Date(Date.now() + VERIFY_TOKEN_EXP_MINUTES * 60 * 1000),
      createdBy: currentUser._id
    });

    await newUser.save();

    // Re-asociar de forma inmediata cualquier certificación huérfana para el usuario recién creado
    try {
      const { healOrphanedCertifications } = await import('../utils/userHealer');
      await healOrphanedCertifications();
    } catch (healError) {
      console.error('Error al curar certificaciones huérfanas tras creación de usuario:', healError);
    }

    let emailWarning = '';
    try {
      await sendVerificationEmail({
        to: newUser.email,
        name: newUser.firstName || newUser.username,
        verifyLink: buildVerifyLink(verificationToken, newUser.email),
        expiresInMinutes: VERIFY_TOKEN_EXP_MINUTES
      });
    } catch (emailError) {
      console.error('Usuario creado, pero fallo el envio de verificacion:', emailError);
      emailWarning = ' No se pudo enviar el correo de verificacion.';
    }

    const userResponse = await User.findById(newUser._id)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email')
      .populate('department')
      .populate('managedDepartments')
      .populate('position');

    res.status(201).json({
      success: true,
      data: userResponse,
      message: `Usuario creado exitosamente.${emailWarning}`
    });
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    // Retornar error de validación específico de Mongoose con código 400
    if (error && error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    const allowedFields: (keyof UpdateUserRequest)[] = [
      'username',
      'email',
      'personalEmail',
      'firstName',
      'lastName',
      'role',
      'department',
      'position',
      'phone',
      'avatarUrl',
      'avatar',
      'isActive',
      'departmentLeader',
      'managedDepartments',
      'permissions',
      'password'
    ];
    const updateData: UpdateUserRequest = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (updateData as any)[field] = req.body[field];
      }
    });

    const { requirePersonalEmail } = await getResolvedServerPolicy();

    if (requirePersonalEmail) {
      const incomingPersonalEmail = req.body.personalEmail;
      if (incomingPersonalEmail !== undefined && (!incomingPersonalEmail || !incomingPersonalEmail.trim())) {
        res.status(400).json({
          success: false,
          error: 'El correo personal es requerido'
        });
        return;
      }
    }

    if (!currentUser.hasPermission(Permission.UPDATE_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para actualizar usuarios'
      });
      return;
    }

    const userToUpdate = await User.findById(id).select('+password');
    if (!userToUpdate) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Resolver al vuelo departamento, posición y departamentos gestionados
    if (updateData.department) {
      updateData.department = await resolveDepartment(String(updateData.department));
    }
    if (updateData.position) {
      updateData.position = await resolvePosition(String(updateData.position));
    }
    if (updateData.managedDepartments && Array.isArray(updateData.managedDepartments)) {
      const resolvedManagedDepts: any[] = [];
      for (const dept of updateData.managedDepartments) {
        resolvedManagedDepts.push(await resolveDepartment(String(dept)));
      }
      updateData.managedDepartments = resolvedManagedDepts;
    }

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const myDeptId = currentUser.department?._id ? currentUser.department._id.toString() : currentUser.department?.toString();
      const userToUpdateDeptId = userToUpdate.department?._id ? userToUpdate.department._id.toString() : userToUpdate.department?.toString();
      
      const allowedDeptIds = [myDeptId];
      if (currentUser.managedDepartments) {
        allowedDeptIds.push(...currentUser.managedDepartments.map((d: any) => d._id ? d._id.toString() : d.toString()));
      }

      if (!allowedDeptIds.includes(userToUpdateDeptId)) {
        res.status(403).json({
          success: false,
          error: 'No puedes actualizar usuarios de este departamento'
        });
        return;
      }

      if (updateData.role && [UserRole.ADMIN, UserRole.LIDER].includes(updateData.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para asignar este rol'
        });
        return;
      }

      if (updateData.department) {
        const targetDeptId = updateData.department.toString();
        if (!allowedDeptIds.includes(targetDeptId)) {
          res.status(403).json({
            success: false,
            error: 'No puedes mover usuarios a este departamento'
          });
          return;
        }
      }
    }

    if (userToUpdate._id?.toString() === currentUser._id?.toString() && updateData.role) {
      res.status(400).json({
        success: false,
        error: 'No puedes cambiar tu propio rol'
      });
      return;
    }

    const avatarProvided =
      Object.prototype.hasOwnProperty.call(updateData, 'avatar') ||
      Object.prototype.hasOwnProperty.call(updateData, 'avatarUrl');
    if (avatarProvided) {
      const incomingAvatar = updateData.avatar;
      if (incomingAvatar && typeof incomingAvatar === 'string' && incomingAvatar.startsWith('data:image')) {
        try {
          const storedUrl = saveBase64Avatar(incomingAvatar);
          updateData.avatarUrl = storedUrl;
          updateData.avatar = undefined;
        } catch {
          res.status(400).json({ success: false, error: 'Avatar invalido' });
          return;
        }
      } else {
        updateData.avatarUrl = updateData.avatarUrl || updateData.avatar || undefined;
        updateData.avatar = updateData.avatar || undefined;
      }
    }

    if (updateData.password && currentUser.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        error: 'Solo un administrador puede cambiar contraseñas de otros usuarios'
      });
      return;
    }

    // Construir los campos del usuario actualizados de forma segura
    const setPayload: any = {
      ...updateData,
      email: updateData.email ? updateData.email.toLowerCase() : userToUpdate.email
    };

    // Solo modificar personalEmail si viene explícitamente en la petición
    if (updateData.personalEmail !== undefined) {
      setPayload.personalEmail = updateData.personalEmail
        ? updateData.personalEmail.toLowerCase().trim()
        : (requirePersonalEmail ? '' : userToUpdate.personalEmail);
    } else {
      // Si no viene en el payload, mantener el valor actual sin tocarlo
      delete setPayload.personalEmail;
    }

    userToUpdate.set(setPayload);

    // Usar validateBeforeSave: false para evitar rechazos en usuarios legacy sin personalEmail
    await userToUpdate.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(id)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email')
      .populate('department')
      .populate('managedDepartments')
      .populate('position');

    res.json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    // Retornar error de validación específico de Mongoose con código 400
    if (error && error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    if (!currentUser.hasPermission(Permission.DELETE_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar usuarios'
      });
      return;
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    if (userToDelete._id?.toString() === currentUser._id?.toString()) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
      return;
    }

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const myDeptId = currentUser.department?._id ? currentUser.department._id.toString() : currentUser.department?.toString();
      const userToDeleteDeptId = userToDelete.department?._id ? userToDelete.department._id.toString() : userToDelete.department?.toString();
      
      const allowedDeptIds = [myDeptId];
      if (currentUser.managedDepartments) {
        allowedDeptIds.push(...currentUser.managedDepartments.map((d: any) => d._id ? d._id.toString() : d.toString()));
      }

      if (!allowedDeptIds.includes(userToDeleteDeptId)) {
        res.status(403).json({
          success: false,
          error: 'No puedes eliminar usuarios de este departamento'
        });
        return;
      }

      if ([UserRole.ADMIN, UserRole.LIDER].includes(userToDelete.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para eliminar usuarios con este rol'
        });
        return;
      }
    }

    const fullName = `${userToDelete.firstName} ${userToDelete.lastName}`;
    // Se buscan las certificaciones del usuario actual por su ID y tambien de forma complementaria por su nombre completo y departamento
    // para recuperar certificaciones huerfanas en caso de que la cuenta haya sido eliminada y recreada con anterioridad.
    const certifications = await Certification.find({
      $or: [
        { employeeId: id },
        { employeeName: fullName, department: userToDelete.department }
      ]
    }).sort({ issueDate: -1 });

    if (certifications.length > 0) {
      const { sendBackupOnDelete: sendBackup } = await getResolvedServerPolicy();

      // 1. Envío del Correo de Respaldo (si está activo en las políticas del servidor)
      if (sendBackup) {
        try {
          await sendUserCertificationsArchiveEmail({
            to: userToDelete.personalEmail,
            name: `${userToDelete.firstName} ${userToDelete.lastName}`,
            companyEmail: userToDelete.email,
            certifications: certifications.map((cert: any) => ({
              title: cert.title,
              provider: cert.provider,
              technology: cert.technology,
              level: cert.level,
              certificateNumber: cert.certificateNumber,
              issueDate: cert.issueDate,
              expirationDate: cert.expirationDate,
              status: cert.status,
              certificateUrl: cert.certificateUrl
            }))
          });

          // Registrar en auditoría el éxito del envío del correo de respaldo
          await recordAuditLog({
            action: AuditAction.DELETE,
            resource: 'users',
            resourceId: id as string,
            userId: currentUser._id,
            userEmail: currentUser.email,
            userRole: currentUser.role,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            statusCode: 200,
            message: `Respaldo de certificaciones enviado exitosamente a ${userToDelete.personalEmail || userToDelete.email} al eliminar el usuario.`,
            metadata: {
              recipient: userToDelete.personalEmail || userToDelete.email,
              certificationsCount: certifications.length,
              titles: certifications.map(c => c.title)
            }
          });
        } catch (mailError) {
          console.error('Error al enviar el correo de respaldo al eliminar usuario:', mailError);
          // Registrar en auditoría el fallo del envío del correo (la eliminación física prosigue)
          await recordAuditLog({
            action: AuditAction.DELETE,
            resource: 'users',
            resourceId: id as string,
            userId: currentUser._id,
            userEmail: currentUser.email,
            userRole: currentUser.role,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            statusCode: 500,
            message: `Fallo al enviar correo de respaldo al eliminar usuario ${userToDelete.email}. Error: ${(mailError as Error).message}`,
            metadata: {
              error: (mailError as Error).message,
              stack: (mailError as Error).stack,
              recipient: userToDelete.personalEmail || userToDelete.email
            }
          });
        }
      }

      // 2. Eliminación de los archivos físicos de certificados del disco
      try {
        for (const cert of certifications) {
          if (cert.certificateUrl && cert.certificateUrl.startsWith('/uploads/certificates/')) {
            const fileName = path.basename(cert.certificateUrl);
            // Se utiliza __dirname de forma absoluta para evitar fallos de resolución con process.cwd() en desarrollo o Docker
            const filePath = path.resolve(__dirname, '../../uploads/certificates', fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
      } catch (fileError) {
        console.error('Error al eliminar físicamente los archivos de certificados:', fileError);
      }
    } else {
      // Si no se encontraron certificaciones, verificamos si existen registros huérfanos asociados
      const rawCertsCount = await Certification.collection.countDocuments({
        employeeId: id // Consulta directa a MongoDB sin casteo de Mongoose
      });

      const totalCertsInDb = await Certification.countDocuments({});

      // Registrar en la auditoría el porqué no se envió el correo de respaldo
      await recordAuditLog({
        action: AuditAction.DELETE,
        resource: 'users',
        resourceId: id as string,
        userId: currentUser._id,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: 200,
        message: rawCertsCount > 0
          ? `Omitido correo de respaldo al eliminar usuario ${userToDelete.email}: se detectaron ${rawCertsCount} certificados guardados incorrectamente en la BD. Re-importe el backup con el sistema corregido.`
          : `Omitido correo de respaldo al eliminar usuario ${userToDelete.email}: no tiene ninguna certificación asociada en la base de datos (total certificaciones en la plataforma: ${totalCertsInDb}).`,
        metadata: {
          rawCertificationsFound: rawCertsCount,
          totalCertificationsInDb: totalCertsInDb,
          searchedEmployeeId: id
        }
      });
    }

    // 3. Eliminación en cascada de los registros en base de datos
    const certIds = certifications.map(c => c._id);
    await Certification.deleteMany({
      $or: [
        { _id: { $in: certIds } },
        { employeeId: id }
      ]
    });
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: certifications.length > 0
        ? 'Usuario eliminado y certificaciones enviadas al correo personal'
        : 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;

    if (!currentUser.hasPermission(Permission.VIEW_REPORTS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver estadisticas'
      });
      return;
    }

    let departmentFilter = {};
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      departmentFilter = { department: { $in: allowedDepartments } };
    }

    const [totalUsers, activeUsers, inactiveUsers, usersByRole, usersByDepartment, departmentLeaders] =
      await Promise.all([
        User.countDocuments(departmentFilter),
        User.countDocuments({ ...departmentFilter, isActive: true }),
        User.countDocuments({ ...departmentFilter, isActive: false }),
        User.aggregate([{ $match: departmentFilter }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
        User.aggregate([{ $match: departmentFilter }, { $group: { _id: '$department', count: { $sum: 1 } } }]),
        User.countDocuments({ ...departmentFilter, departmentLeader: true })
      ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        departmentLeaders,
        byRole: usersByRole.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDepartment: usersByDepartment.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadisticas de usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const getDepartments = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find({ isActive: true });
    const formatted = departments.map(d => ({
      key: d._id.toString(),
      value: d._id.toString(),
      label: d.name,
      _id: d._id.toString(),
      name: d.name,
      code: d.code,
      leaderId: d.leaderId,
      isActive: d.isActive
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;

    if (!currentUser.hasPermission(Permission.READ_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver roles'
      });
      return;
    }

    let availableRoles = Object.entries(UserRole).map(([key, value]) => ({
      key,
      value,
      label: value
    }));

    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      availableRoles = availableRoles.filter(
        (role) => ![UserRole.ADMIN, UserRole.LIDER].includes(role.value as UserRole)
      );
    }

    res.json({
      success: true,
      data: availableRoles
    });
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const forcePasswordChange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { userIds, all } = req.body as { userIds?: string[]; all?: boolean };

    if (!currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para forzar el cambio de contraseña'
      });
      return;
    }

    if (all) {
      // Forzar cambio a todos los usuarios excepto al administrador actual
      const result = await User.updateMany(
        { _id: { $ne: currentUser._id }, role: { $ne: UserRole.ADMIN } },
        { $set: { mustChangePassword: true } }
      );

      res.json({
        success: true,
        message: `Se forzó el cambio de contraseña para ${result.modifiedCount} usuarios.`
      });
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Forzar cambio a la lista de usuarios seleccionados
      const result = await User.updateMany(
        { _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { $set: { mustChangePassword: true } }
      );

      res.json({
        success: true,
        message: `Se forzó el cambio de contraseña para ${result.modifiedCount} usuarios.`
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Debe especificar usuarios o marcar la opción para todos.'
      });
    }
  } catch (error) {
    console.error('Error forzando cambio masivo de contraseñas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const bulkUpdateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { userIds, departmentId } = req.body as { userIds?: string[]; departmentId?: string };

    if (!currentUser.hasPermission(Permission.SYSTEM_ADMIN) && currentUser.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para actualizar departamentos masivamente'
      });
      return;
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !departmentId) {
      res.status(400).json({
        success: false,
        error: 'Debe especificar los usuarios y el departamento de destino.'
      });
      return;
    }

    const resolvedDeptId = await resolveDepartment(departmentId);

    const result = await User.updateMany(
      { _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { department: resolvedDeptId } }
    );

    res.json({
      success: true,
      message: `Se actualizó el departamento para ${result.modifiedCount} usuarios.`
    });
  } catch (error) {
    console.error('Error en actualización masiva de departamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
