import crypto from 'crypto';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { saveBase64Avatar } from '../utils/avatar';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  position?: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

const RESET_TOKEN_EXP_MINUTES = Number(process.env.RESET_PASSWORD_EXPIRE_MINUTES || 10);
const VERIFY_TOKEN_EXP_MINUTES = Number(process.env.VERIFY_EMAIL_EXPIRE_MINUTES || 60);
const APP_NAME = process.env.APP_NAME || 'CertiVault';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

const buildResetLink = (token: string, email: string): string => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  return `${base}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
};

const buildVerifyLink = (token: string, email: string): string => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  return `${base}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, department, position, phone }: RegisterData =
      req.body;

    const normalizedEmail = normalizeEmail(email);

    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }]
    });

    if (userExists) {
      res.status(400).json({
        success: false,
        error: 'El usuario ya existe con ese email o nombre de usuario',
        message: 'El usuario ya existe con ese email o nombre de usuario'
      });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const user = await User.create({
      username,
      email: normalizedEmail,
      password,
      firstName,
      lastName,
      department,
      position: position || 'Colaborador',
      phone,
      role: UserRole.READER,
      isActive: true,
      isVerified: false,
      verificationToken: hashedVerificationToken,
      verificationExpires: new Date(Date.now() + VERIFY_TOKEN_EXP_MINUTES * 60 * 1000)
    });

    const verifyLink = buildVerifyLink(verificationToken, user.email);
    await sendVerificationEmail({
      to: user.email,
      name: user.firstName || user.username,
      verifyLink,
      expiresInMinutes: VERIFY_TOKEN_EXP_MINUTES
    });

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos completar el registro. Intenta nuevamente.',
      message: 'No pudimos completar el registro. Intenta nuevamente.'
    });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginData = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password +refreshToken');

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos, o la cuenta esta inactiva.',
        message: 'Correo o contraseña incorrectos, o la cuenta esta inactiva.'
      });
      return;
    }

    if (user.isVerified === false) {
      res.status(401).json({
        success: false,
        error: 'Debes verificar tu correo antes de iniciar sesión.',
        message: 'Debes verificar tu correo antes de iniciar sesión.'
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos.',
        message: 'Correo o contraseña incorrectos.'
      });
      return;
    }

    const token = generateToken(user._id as string);
    const refreshToken = generateRefreshToken(user._id as string);

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
          avatarUrl: user.avatarUrl,
          avatar: user.avatar,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        expiresIn: 7 * 24 * 60 * 60
      },
      message: 'Inicio de sesion exitoso'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos iniciar sesion. Intenta nuevamente.',
      message: 'No pudimos iniciar sesion. Intenta nuevamente.'
    });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token requerido',
        message: 'Refresh token requerido'
      });
      return;
    }

    const decoded = jwt.verify(clientRefreshToken, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== clientRefreshToken || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Refresh token invalido',
        message: 'Refresh token invalido'
      });
      return;
    }

    const newToken = generateToken(user._id as string);
    const newRefreshToken = generateRefreshToken(user._id as string);

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
          avatarUrl: user.avatarUrl,
          avatar: user.avatar,
          isActive: user.isActive
        },
        expiresIn: 7 * 24 * 60 * 60
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Refresh token invalido',
      message: 'Refresh token invalido'
    });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save();
    }

    res.json({
      success: true,
      message: 'Sesion cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos cerrar la sesion. Intenta nuevamente.',
      message: 'No pudimos cerrar la sesion. Intenta nuevamente.'
    });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        message: 'Usuario no autenticado'
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
        avatarUrl: req.user.avatarUrl,
        avatar: req.user.avatar,
        isActive: req.user.isActive,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos cargar tu perfil. Intenta nuevamente.',
      message: 'No pudimos cargar tu perfil. Intenta nuevamente.'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        message: 'Usuario no autenticado'
      });
      return;
    }

    const { firstName, lastName, phone, avatarUrl, avatar } = req.body;

    if (firstName) req.user.firstName = firstName;
    if (lastName) req.user.lastName = lastName;
    if (phone !== undefined) req.user.phone = phone;

    const avatarProvided = avatarUrl !== undefined || avatar !== undefined;
    if (avatarProvided) {
      if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image')) {
        try {
          const storedUrl = saveBase64Avatar(avatar);
          req.user.avatarUrl = storedUrl;
          req.user.avatar = undefined;
        } catch {
          res.status(400).json({ success: false, error: 'Avatar invalido', message: 'Avatar invalido' });
          return;
        }
      } else {
        req.user.avatarUrl = avatarUrl || avatar || undefined;
        req.user.avatar = avatar || undefined;
      }
    }

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
        avatarUrl: req.user.avatarUrl,
        avatar: req.user.avatar,
        isActive: req.user.isActive
      },
      message: 'Perfil actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos actualizar el perfil. Intenta nuevamente.',
      message: 'No pudimos actualizar el perfil. Intenta nuevamente.'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        message: 'Usuario no autenticado'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Se requiere la contraseña actual y la nueva contraseña',
        message: 'Se requiere la contraseña actual y la nueva contraseña'
      });
      return;
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'Usuario no encontrado'
      });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: 'La contraseña actual es incorrecta',
        message: 'La contraseña actual es incorrecta'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

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
      error: 'No pudimos cambiar la contraseña. Intenta nuevamente.',
      message: 'No pudimos cambiar la contraseña. Intenta nuevamente.'
    });
  }
};

export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({
        success: false,
        error: 'El email es requerido',
        message: 'El email es requerido'
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXP_MINUTES * 60 * 1000);
      await user.save();

      const resetLink = buildResetLink(token, user.email);
      await sendPasswordResetEmail({
        to: user.email,
        name: user.firstName || user.username,
        resetLink,
        expiresInMinutes: RESET_TOKEN_EXP_MINUTES
      });
    }

    res.json({
      success: true,
      message: 'Si el correo esta registrado, enviamos un enlace para restablecer la contraseña.'
    });
  } catch (error) {
    console.error('Error solicitando reset de contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos enviar el enlace. Intenta nuevamente.',
      message: 'No pudimos enviar el enlace. Intenta nuevamente.'
    });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword, email } = req.body as { token: string; newPassword: string; email?: string };

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Token y nueva contraseña son requeridos',
        message: 'Token y nueva contraseña son requeridos'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      ...(email ? { email: normalizeEmail(email) } : {})
    }).select('+password');

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'El enlace de restablecimiento es invalido o ya expiro',
        message: 'El enlace de restablecimiento es invalido o ya expiro'
      });
      return;
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada. Ya puedes iniciar sesion.'
    });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos restablecer la contraseña. Intenta nuevamente.',
      message: 'No pudimos restablecer la contraseña. Intenta nuevamente.'
    });
  }
};

export const verifyEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body as { token: string; email?: string };

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token de verificacion requerido',
        message: 'Token de verificacion requerido'
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: new Date() },
      ...(email ? { email: normalizeEmail(email) } : {})
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'El enlace de verificacion es invalido o expiro',
        message: 'El enlace de verificacion es invalido o expiro'
      });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Cuenta verificada. Ya puedes iniciar sesion.'
    });
  } catch (error) {
    console.error('Error verificando correo:', error);
    res.status(500).json({
      success: false,
      error: 'No pudimos verificar el correo. Intenta nuevamente.',
      message: 'No pudimos verificar el correo. Intenta nuevamente.'
    });
  }
};
