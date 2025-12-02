import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { User, IUser, UserRole, Permission } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Acceso denegado. Token no proporcionado.'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Token inválido o usuario inactivo.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido.'
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acceso denegado. Usuario no autenticado.'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Permisos insuficientes.'
      });
      return;
    }

    next();
  };
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acceso denegado. Usuario no autenticado.'
      });
      return;
    }

    if (!req.user.hasPermission(permission)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Permisos insuficientes.'
      });
      return;
    }

    next();
  };
};

// Middleware para verificar gestión de departamento
export const requireDepartmentAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Acceso denegado. Usuario no autenticado.'
    });
    return;
  }

  const targetDepartment = req.body.department || req.params.department;
  
  if (targetDepartment && !req.user.canManageDepartment(targetDepartment)) {
    res.status(403).json({
      success: false,
      error: 'Acceso denegado. No puedes gestionar este departamento.'
    });
    return;
  }

  next();
};

// Middlewares de conveniencia
export const adminOnly = authorize(UserRole.ADMIN);
export const leaderOrAdmin = authorize(UserRole.LIDER, UserRole.ADMIN);
export const technicianOrAbove = authorize(UserRole.TECNICO, UserRole.LIDER, UserRole.ADMIN);