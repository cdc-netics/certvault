import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, any>;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  logger.error('Error en peticion', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((val: any) => val.message)
      .join(', ');
    error = {
      message,
      statusCode: 400
    } as CustomError;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = `Ya existe un registro con ese ${field}`;
    error = {
      message,
      statusCode: 400
    } as CustomError;
  }

  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado';
    error = {
      message,
      statusCode: 404
    } as CustomError;
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalido';
    error = {
      message,
      statusCode: 401
    } as CustomError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = {
      message,
      statusCode: 401
    } as CustomError;
  }

  const statusCode = error.statusCode || 500;
  const userMessage =
    statusCode >= 500
      ? 'No pudimos procesar tu solicitud en este momento. Intenta de nuevo en unos minutos.'
      : error.message || 'Solicitud invalida';

  res.status(statusCode).json({
    success: false,
    error: userMessage,
    message: userMessage,
    code: statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
