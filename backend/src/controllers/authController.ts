import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Generar JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generar Refresh Token
const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      department, 
      position, 
      phone 
    }: RegisterData = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (userExists) {
      res.status(400).json({
        success: false,
        error: 'El usuario ya existe con ese email o nombre de usuario'
      });
      return;
    }

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      department,
      position,
      phone,
      role: UserRole.USER,
      isActive: true
    });

    // Generar tokens
    const token = generateToken(user._id as string);
    const refreshToken = generateRefreshToken(user._id as string);

    // Guardar refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          isActive: user.isActive
        },
        expiresIn: 7 * 24 * 60 * 60 // 7 días en segundos
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginData = req.body;

    // Verificar si el usuario existe y obtener password
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas o usuario inactivo'
      });
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
      return;
    }

    // Generar tokens
    const token = generateToken(user._id as string);
    const refreshToken = generateRefreshToken(user._id as string);

    // Actualizar último login y refresh token
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        expiresIn: 7 * 24 * 60 * 60 // 7 días en segundos
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Refrescar token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token requerido'
      });
      return;
    }

    // Verificar refresh token
    const decoded = jwt.verify(clientRefreshToken, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== clientRefreshToken || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Refresh token inválido'
      });
      return;
    }

    // Generar nuevos tokens
    const newToken = generateToken(user._id as string);
    const newRefreshToken = generateRefreshToken(user._id as string);

    // Actualizar refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          isActive: user.isActive
        },
        expiresIn: 7 * 24 * 60 * 60
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Refresh token inválido'
    });
  }
};

// @desc    Cerrar sesión
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Limpiar refresh token
      req.user.refreshToken = undefined;
      await req.user.save();
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        department: req.user.department,
        position: req.user.position,
        phone: req.user.phone,
        isActive: req.user.isActive,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar perfil
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    const { firstName, lastName, phone } = req.body;

    // Actualizar campos permitidos
    if (firstName) req.user.firstName = firstName;
    if (lastName) req.user.lastName = lastName;
    if (phone !== undefined) req.user.phone = phone;

    await req.user.save();

    res.json({
      success: true,
      data: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        department: req.user.department,
        position: req.user.position,
        phone: req.user.phone,
        isActive: req.user.isActive
      },
      message: 'Perfil actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validar que se proporcionen ambas contraseñas
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Se requiere la contraseña actual y la nueva contraseña'
      });
      return;
    }

    // Obtener usuario con la contraseña
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
      return;
    }

    // Validar nueva contraseña
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};