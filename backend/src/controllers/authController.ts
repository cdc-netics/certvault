import crypto from 'crypto';
import { Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { saveBase64Avatar } from '../utils/avatar';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { AuditLog } from '../models/AuditLog';
import { SecuritySettings } from '../models/SecuritySettings';

interface RegisterData {
  username: string;
  email: string;
  personalEmail: string;
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

const getFrontendBaseUrl = (req?: Request): string => {
  // Se obtiene el valor estatico configurado como respaldo
  const envBase = process.env.FRONTEND_URL?.trim() || '';
  // Se separan multiples URLs en caso de estar configuradas por comas en las variables de entorno
  const urls = envBase.split(',').map(u => u.trim()).filter(Boolean);

  if (req) {
    // 1. Validacion mediante la cabecera Origin (enviada tipicamente en llamadas CORS del cliente)
    const origin = req.headers.origin as string;
    if (origin) {
      const matched = urls.find(u => u.toLowerCase().startsWith(origin.toLowerCase()));
      if (matched) {
        return matched.replace(/\/$/, '');
      }
      return origin.replace(/\/$/, '');
    }

    // 2. Validacion secundaria mediante la cabecera Referer
    const referer = req.headers.referer as string;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const originFromRef = refUrl.origin;
        const matched = urls.find(u => u.toLowerCase().startsWith(originFromRef.toLowerCase()));
        if (matched) {
          return matched.replace(/\/$/, '');
        }
        return originFromRef.replace(/\/$/, '');
      } catch {
        // Se ignora el fallo del formateador de URL en caso de referers maliciosos o invalidos
      }
    }

    // 3. Validacion terciaria usando cabeceras Host y Protocolo (incluyendo soporte para Proxies)
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    if (host) {
      const generatedUrl = `${protocol}://${host}`;
      const matched = urls.find(u => u.toLowerCase().startsWith(generatedUrl.toLowerCase()));
      if (matched) {
        return matched.replace(/\/$/, '');
      }
      return generatedUrl.replace(/\/$/, '');
    }
  }

  // Si no se pudo determinar dinamicamente, se opta por el primer valor definido en el entorno
  const defaultUrl = urls[0];
  if (defaultUrl) {
    return defaultUrl.replace(/\/$/, '');
  }

  throw new Error('FRONTEND_URL no esta definido en las variables de entorno y no se pudo determinar desde la peticion.');
};

const buildResetLink = (token: string, email: string, req?: Request): string => {
  const base = getFrontendBaseUrl(req);
  return `${base}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
};

const buildVerifyLink = (token: string, email: string, req?: Request): string => {
  const base = getFrontendBaseUrl(req);
  return `${base}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, personalEmail, password, firstName, lastName, department, position, phone }: RegisterData =
      req.body;

    const normalizedEmail = normalizeEmail(email);
    const normalizedPersonalEmail = normalizeEmail(personalEmail);

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
      personalEmail: normalizedPersonalEmail,
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

    // Se construye el enlace de verificacion pasando el objeto req para calcular la URL de forma dinamica
    const verifyLink = buildVerifyLink(verificationToken, user.email, req);
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

    if (!user || user.isActive === false) {
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

    // Verificar si la contraseña expiró según las políticas de seguridad globales
    const settings = await SecuritySettings.findOne();
    const expirationEnabled = settings?.passwordExpirationEnabled || false;
    let isExpired = false;
    if (expirationEnabled) {
      const expirationDate = new Date(user.passwordChangedAt || user.createdAt);
      expirationDate.setMonth(expirationDate.getMonth() + (settings?.passwordExpirationMonths || 3));
      isExpired = new Date() > expirationDate;
    }

    // Se comprueba si el usuario actual coincide con el correo del administrador semilla del archivo .env
    const envAdminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : 'admin@empresa.com';
    const isSeedAdmin = user.email.toLowerCase().trim() === envAdminEmail;

    // Verificar si le falta el correo personal o es idéntico al corporativo
    const isPersonalEmailMissingOrEqual = !user.personalEmail || 
      user.personalEmail.toLowerCase().trim() === user.email.toLowerCase().trim();

    // Si la contraseña expiro o falta el correo de respaldo, se exige su cambio obligatorio.
    // Se establece una excepcion para el administrador de semilla para facilitar las pruebas y administracion inicial.
    if (isSeedAdmin) {
      user.mustChangePassword = false;
      user.termsAccepted = true;
    } else if (isExpired || isPersonalEmailMissingOrEqual) {
      user.mustChangePassword = true;
    }

    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    // Se deshabilita la validacion del esquema al guardar marcas de sesion y tokens.
    // Esto previene que usuarios con perfiles antiguos e incompletos (p. ej. sin correo personal)
    // sufran excepciones del esquema de Mongoose al loguearse y queden bloqueados sin poder ingresar.
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          personalEmail: user.personalEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          avatar: user.avatar,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword,
          termsAccepted: user.termsAccepted,
          termsAcceptedAt: user.termsAcceptedAt,
          requiresPersonalEmailUpdate: isPersonalEmailMissingOrEqual && !isSeedAdmin
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

    if (!user || user.refreshToken !== clientRefreshToken || user.isActive === false) {
      res.status(401).json({
        success: false,
        error: 'Refresh token invalido',
        message: 'Refresh token invalido'
      });
      return;
    }

    const newToken = generateToken(String(user._id));
    const newRefreshToken = generateRefreshToken(String(user._id));

    user.refreshToken = newRefreshToken;
    // Se deshabilita la validacion para evitar interrupciones al renovar la sesion del usuario.
    await user.save({ validateBeforeSave: false });

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
      // Se omite la validacion para asegurar que el proceso de logout finalice sin excepciones del esquema.
      await req.user.save({ validateBeforeSave: false });
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
        personalEmail: req.user.personalEmail,
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
        mustChangePassword: req.user.mustChangePassword,
        termsAccepted: req.user.termsAccepted,
        termsAcceptedAt: req.user.termsAcceptedAt,
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

    const { firstName, lastName, phone, personalEmail, avatarUrl, avatar } = req.body;

    if (firstName) req.user.firstName = firstName;
    if (lastName) req.user.lastName = lastName;
    if (phone !== undefined) req.user.phone = phone;
    if (personalEmail !== undefined) req.user.personalEmail = personalEmail.trim().toLowerCase();

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
        personalEmail: req.user.personalEmail,
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

    const { currentPassword, newPassword, personalEmail } = req.body;

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

    // Verificar si al usuario le falta configurar el correo personal o si es igual al corporativo
    const isPersonalEmailMissingOrEqual = !user.personalEmail || 
      user.personalEmail.toLowerCase().trim() === user.email.toLowerCase().trim();

    if (isPersonalEmailMissingOrEqual) {
      const emailToUse = personalEmail || req.body.email; // Soporte a campos alternativos
      if (!emailToUse || !emailToUse.trim()) {
        res.status(400).json({
          success: false,
          error: 'Debe ingresar un correo personal válido diferente al corporativo.',
          message: 'Debe ingresar un correo personal válido diferente al corporativo.'
        });
        return;
      }

      const normalizedPersonal = emailToUse.toLowerCase().trim();
      if (normalizedPersonal === user.email.toLowerCase().trim()) {
        res.status(400).json({
          success: false,
          error: 'El correo personal no puede ser igual al correo de la empresa.',
          message: 'El correo personal no puede ser igual al correo de la empresa.'
        });
        return;
      }
      user.personalEmail = normalizedPersonal;
    } else if (personalEmail) {
      // Si decide actualizar el correo personal al mismo tiempo
      const normalizedPersonal = personalEmail.toLowerCase().trim();
      if (normalizedPersonal === user.email.toLowerCase().trim()) {
        res.status(400).json({
          success: false,
          error: 'El correo personal no puede ser igual al correo de la empresa.',
          message: 'El correo personal no puede ser igual al correo de la empresa.'
        });
        return;
      }
      user.personalEmail = normalizedPersonal;
    }

    user.password = newPassword;
    user.mustChangePassword = false; // Desmarcar el forzado ya que se cambió con éxito
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
      // Se omite la validacion para garantizar la generacion del token de recuperacion en cualquier cuenta.
      await user.save({ validateBeforeSave: false });

      // Se construye el enlace de restablecimiento pasando el objeto req para calcular la URL de forma dinamica
      const resetLink = buildResetLink(token, user.email, req);
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
    const { token, newPassword, email, personalEmail } = req.body as { token: string; newPassword: string; email?: string; personalEmail?: string };

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

    // Verificar si al usuario le falta configurar el correo personal o si es igual al corporativo
    const isPersonalEmailMissingOrEqual = !user.personalEmail || 
      user.personalEmail.toLowerCase().trim() === user.email.toLowerCase().trim();

    if (isPersonalEmailMissingOrEqual) {
      if (!personalEmail || !personalEmail.trim()) {
        res.status(400).json({
          success: false,
          error: 'Debe ingresar un correo personal válido diferente al corporativo para restablecer la contraseña.',
          message: 'Debe ingresar un correo personal válido diferente al corporativo para restablecer la contraseña.'
        });
        return;
      }

      const normalizedPersonal = personalEmail.toLowerCase().trim();
      if (normalizedPersonal === user.email.toLowerCase().trim()) {
        res.status(400).json({
          success: false,
          error: 'El correo personal no puede ser igual al correo de la empresa.',
          message: 'El correo personal no puede ser igual al correo de la empresa.'
        });
        return;
      }
      user.personalEmail = normalizedPersonal;
    }

    user.password = newPassword;
    user.mustChangePassword = false; // Desmarcar el forzado ya que se cambió con éxito
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
    // Se omite la validacion para asegurar el registro exitoso del estado de verificacion de la cuenta.
    await user.save({ validateBeforeSave: false });

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

export const getMyActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        message: 'Usuario no autenticado'
      });
      return;
    }

    const activity = await AuditLog.find({
      $or: [
        { userId: req.user._id },
        { userEmail: req.user.email }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    const formattedActivity = activity.map(log => ({
      action: log.message || log.action,
      timestamp: log.createdAt,
      ip: log.ip || 'N/A',
      device: log.userAgent || 'Desconocido'
    }));

    res.json({
      success: true,
      data: formattedActivity
    });
  } catch (error) {
    console.error('Error obteniendo la actividad del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la actividad reciente',
      message: 'Error al obtener la actividad reciente'
    });
  }
};

export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body as { token: string; email?: string };

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token de restablecimiento requerido'
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      ...(email ? { email: normalizeEmail(email) } : {})
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'El enlace de restablecimiento es inválido o ya expiró'
      });
      return;
    }

    const requiresPersonalEmail = !user.personalEmail || 
      user.personalEmail.toLowerCase().trim() === user.email.toLowerCase().trim();

    res.json({
      success: true,
      data: {
        valid: true,
        email: user.email,
        requiresPersonalEmail
      }
    });
  } catch (error) {
    console.error('Error verificando token de reset:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Registra la aceptación del documento de términos y condiciones para el usuario autenticado
export const acceptTerms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        message: 'Usuario no autenticado'
      });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Registrar la firma/aceptación omitiendo validaciones de campos no modificados
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          termsAccepted: true,
          termsAcceptedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Términos y condiciones aceptados correctamente',
      data: {
        termsAccepted: true,
        termsAcceptedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error al aceptar términos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la aceptación de los términos y condiciones',
      message: 'Error al procesar la aceptación de los términos y condiciones'
    });
  }
};
