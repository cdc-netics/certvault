import { Request, Response } from 'express';
import { User, UserRole, Department, Permission } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { saveBase64Avatar } from '../utils/avatar';

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  position: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
}

interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  department?: Department;
  position?: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  isActive?: boolean;
  departmentLeader?: boolean;
  managedDepartments?: Department[];
  permissions?: Permission[];
}

interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  department?: Department;
  isActive?: boolean;
  departmentLeader?: boolean;
}

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private (según permisos)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const {
      page = 1,
      limit = 10,
      search,
      role,
      department,
      isActive,
      departmentLeader
    }: UsersQuery = req.query;

    // Verificar permisos
    if (!currentUser.hasPermission(Permission.READ_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver usuarios'
      });
      return;
    }

    // Construir filtros
    const filter: any = {};

    // Los líderes solo pueden ver usuarios de sus departamentos
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      filter.department = { $in: allowedDepartments };
    }

    // Aplicar filtros de búsqueda
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
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (typeof departmentLeader === 'boolean') filter.departmentLeader = departmentLeader;

    // Paginación
    const skip = (Number(page) - 1) * Number(limit);

    // Obtener usuarios
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email')
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

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private (según permisos)
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    // Verificar permisos
    if (!currentUser.hasPermission(Permission.READ_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver usuarios'
      });
      return;
    }

    const user = await User.findById(id)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Los líderes solo pueden ver usuarios de sus departamentos
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      
      if (!allowedDepartments.includes(user.department)) {
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

// @desc    Crear nuevo usuario
// @route   POST /api/users
// @access  Private (Admin o Líder con permisos)
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const userData: CreateUserRequest = req.body;

    // Verificar permisos básicos
    if (!currentUser.hasPermission(Permission.CREATE_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para crear usuarios'
      });
      return;
    }

    // Los líderes solo pueden crear usuarios en sus departamentos
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      
      if (!allowedDepartments.includes(userData.department)) {
        res.status(403).json({
          success: false,
          error: 'No puedes crear usuarios en este departamento'
        });
        return;
      }

      // Los líderes no pueden crear otros líderes o administradores
      if ([UserRole.ADMIN, UserRole.LIDER].includes(userData.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para crear usuarios con este rol'
        });
        return;
      }
    }

    // Verificar que el email y username no existan
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email.toLowerCase() },
        { username: userData.username }
      ]
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'El email o nombre de usuario ya existe'
      });
      return;
    }

    // Crear usuario
    const newUser = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      createdBy: currentUser._id
    });

    await newUser.save();

    // Retornar usuario sin información sensible
    const userResponse = await User.findById(newUser._id)
      .select('-password -refreshToken')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private (Admin o Líder con permisos)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    // Sanitizar campos permitidos (evita escribir campos arbitrarios)
    const allowedFields: (keyof UpdateUserRequest)[] = [
      'username',
      'email',
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
      'permissions'
    ];
    const updateData: UpdateUserRequest = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (updateData as any)[field] = req.body[field];
      }
    });

    // Verificar permisos básicos
    if (!currentUser.hasPermission(Permission.UPDATE_USERS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para actualizar usuarios'
      });
      return;
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Los líderes solo pueden actualizar usuarios de sus departamentos
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      
      if (!allowedDepartments.includes(userToUpdate.department)) {
        res.status(403).json({
          success: false,
          error: 'No puedes actualizar usuarios de este departamento'
        });
        return;
      }

      // Los líderes no pueden cambiar roles a admin o líder
      if (updateData.role && [UserRole.ADMIN, UserRole.LIDER].includes(updateData.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para asignar este rol'
        });
        return;
      }

      // Los líderes no pueden cambiar departamento si no gestionan el destino
      if (updateData.department && !allowedDepartments.includes(updateData.department)) {
        res.status(403).json({
          success: false,
          error: 'No puedes mover usuarios a este departamento'
        });
        return;
      }
    }

    // No permitir auto-promoción de rol
    if (userToUpdate._id?.toString() === currentUser._id?.toString() && updateData.role) {
      res.status(400).json({
        success: false,
        error: 'No puedes cambiar tu propio rol'
      });
      return;
    }

    // Procesar avatar si se envía
    const avatarProvided = Object.prototype.hasOwnProperty.call(updateData, 'avatar') ||
      Object.prototype.hasOwnProperty.call(updateData, 'avatarUrl');
    if (avatarProvided) {
      const incomingAvatar = (updateData as UpdateUserRequest).avatar;
      if (incomingAvatar && typeof incomingAvatar === 'string' && incomingAvatar.startsWith('data:image')) {
        try {
          const storedUrl = saveBase64Avatar(incomingAvatar);
          updateData.avatarUrl = storedUrl;
          updateData.avatar = undefined;
        } catch (err) {
          res.status(400).json({ success: false, error: 'Avatar invalido' });
          return;
        }
      } else {
        updateData.avatarUrl = updateData.avatarUrl || updateData.avatar || undefined;
        updateData.avatar = updateData.avatar || undefined;
      }
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshToken').populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private (Admin o Líder con permisos)
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;

    // Verificar permisos básicos
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

    // No permitir auto-eliminación
    if (userToDelete._id?.toString() === currentUser._id?.toString()) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
      return;
    }

    // Los líderes solo pueden eliminar usuarios de sus departamentos
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      
      if (!allowedDepartments.includes(userToDelete.department)) {
        res.status(403).json({
          success: false,
          error: 'No puedes eliminar usuarios de este departamento'
        });
        return;
      }

      // Los líderes no pueden eliminar otros líderes o administradores
      if ([UserRole.ADMIN, UserRole.LIDER].includes(userToDelete.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para eliminar usuarios con este rol'
        });
        return;
      }
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de usuarios
// @route   GET /api/users/stats
// @access  Private (según permisos)
export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;

    if (!currentUser.hasPermission(Permission.VIEW_REPORTS)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver estadísticas'
      });
      return;
    }

    // Filtro base para líderes
    let departmentFilter = {};
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      const allowedDepartments = [currentUser.department];
      if (currentUser.managedDepartments) {
        allowedDepartments.push(...currentUser.managedDepartments);
      }
      departmentFilter = { department: { $in: allowedDepartments } };
    }

    // Estadísticas generales
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      usersByDepartment,
      departmentLeaders
    ] = await Promise.all([
      User.countDocuments(departmentFilter),
      User.countDocuments({ ...departmentFilter, isActive: true }),
      User.countDocuments({ ...departmentFilter, isActive: false }),
      User.aggregate([
        { $match: departmentFilter },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: departmentFilter },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      User.countDocuments({ ...departmentFilter, departmentLeader: true })
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        departmentLeaders,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDepartment: usersByDepartment.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener departamentos disponibles
// @route   GET /api/users/departments
// @access  Private
export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = Object.entries(Department).map(([key, value]) => ({
      key,
      value,
      label: value
    }));

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener roles disponibles
// @route   GET /api/users/roles
// @access  Private (según permisos)
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

    // Los líderes no pueden ver roles de admin y líder
    if (currentUser.role === UserRole.LIDER && !currentUser.hasPermission(Permission.SYSTEM_ADMIN)) {
      availableRoles = availableRoles.filter(role => 
        ![UserRole.ADMIN, UserRole.LIDER].includes(role.value as UserRole)
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
