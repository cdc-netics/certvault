import { Request, Response } from 'express';
import { SmtpProfile } from '../models/SmtpProfile';
import { AuthRequest } from '../middleware/auth';
import {
  buildTransportFromProfile,
  encryptSecret,
  setActiveSmtpProfile,
  SmtpProfileInput,
  toSafeSmtpProfile
} from '../services/smtpProfileService';
import { ServerPolicy } from '../models/ServerPolicy';
import { logger } from '../config/logger';

const buildUpdatePayload = (body: Partial<SmtpProfileInput>) => {
  const payload: Record<string, unknown> = {};
  const allowedFields: Array<keyof SmtpProfileInput> = [
    'name',
    'host',
    'port',
    'secure',
    'username',
    'fromName',
    'fromEmail',
    'rejectUnauthorized',
    'connectionTimeout'
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  if (body.password) {
    payload.passwordEncrypted = encryptSecret(body.password);
  }

  return payload;
};

export const getSmtpProfiles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await SmtpProfile.find().sort({ isActive: -1, name: 1 }).select('+passwordEncrypted');
    res.json({
      success: true,
      data: profiles.map(toSafeSmtpProfile)
    });
  } catch (error) {
    logger.error('Error listando perfiles SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar perfiles SMTP'
    });
  }
};

export const createSmtpProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = new SmtpProfile({
      ...buildUpdatePayload(req.body),
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await profile.save();

    if (req.body.isActive) {
      await setActiveSmtpProfile(profile.id);
    }

    const savedProfile = await SmtpProfile.findById(profile.id).select('+passwordEncrypted');
    res.status(201).json({
      success: true,
      data: savedProfile ? toSafeSmtpProfile(savedProfile) : toSafeSmtpProfile(profile),
      message: 'Perfil SMTP creado exitosamente'
    });
  } catch (error: any) {
    logger.error('Error creando perfil SMTP:', error);
    res.status(400).json({
      success: false,
      error: error.code === 11000 ? 'Ya existe un perfil SMTP con ese nombre' : 'Error al crear perfil SMTP'
    });
  }
};

export const updateSmtpProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await SmtpProfile.findById(req.params.id);
    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Perfil SMTP no encontrado'
      });
      return;
    }

    Object.assign(profile, buildUpdatePayload(req.body), { updatedBy: req.user?._id });
    await profile.save();

    if (req.body.isActive === true) {
      await setActiveSmtpProfile(profile.id);
    } else if (req.body.isActive === false) {
      profile.isActive = false;
      await profile.save();
    }

    const savedProfile = await SmtpProfile.findById(profile.id).select('+passwordEncrypted');
    res.json({
      success: true,
      data: savedProfile ? toSafeSmtpProfile(savedProfile) : toSafeSmtpProfile(profile),
      message: 'Perfil SMTP actualizado exitosamente'
    });
  } catch (error: any) {
    logger.error('Error actualizando perfil SMTP:', error);
    res.status(400).json({
      success: false,
      error: error.code === 11000 ? 'Ya existe un perfil SMTP con ese nombre' : 'Error al actualizar perfil SMTP'
    });
  }
};

export const deleteSmtpProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await SmtpProfile.findByIdAndDelete(req.params.id);
    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Perfil SMTP no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Perfil SMTP eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando perfil SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar perfil SMTP'
    });
  }
};

export const activateSmtpProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!profileId) {
      res.status(400).json({
        success: false,
        error: 'ID de perfil SMTP requerido'
      });
      return;
    }

    const profile = await setActiveSmtpProfile(profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Perfil SMTP no encontrado'
      });
      return;
    }

    const savedProfile = await SmtpProfile.findById(profileId).select('+passwordEncrypted');
    res.json({
      success: true,
      data: savedProfile ? toSafeSmtpProfile(savedProfile) : toSafeSmtpProfile(profile),
      message: 'Perfil SMTP activado exitosamente'
    });
  } catch (error) {
    logger.error('Error activando perfil SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al activar perfil SMTP'
    });
  }
};

export const deactivateSmtpProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await SmtpProfile.findById(req.params.id);
    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Perfil SMTP no encontrado'
      });
      return;
    }

    profile.isActive = false;
    await profile.save();

    res.json({
      success: true,
      data: toSafeSmtpProfile(profile),
      message: 'Perfil SMTP desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error desactivando perfil SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar perfil SMTP'
    });
  }
};

export const testSmtpProfile = async (req: Request, res: Response): Promise<void> => {
  const { to } = req.body as { to?: string };

  try {
    const profile = await SmtpProfile.findById(req.params.id).select('+passwordEncrypted');
    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Perfil SMTP no encontrado'
      });
      return;
    }

    const mailer = buildTransportFromProfile(profile);
    await mailer.transporter.verify();

    if (to) {
      await mailer.transporter.sendMail({
        from: mailer.from,
        to,
        subject: 'Prueba SMTP - CertiVault',
        text: `Prueba de conexion SMTP exitosa para el perfil "${profile.name}".`,
        html: `<p>Prueba de conexion SMTP exitosa para el perfil <strong>${profile.name}</strong>.</p>`
      });
    }

    profile.lastTestAt = new Date();
    profile.lastTestSuccess = true;
    profile.lastTestMessage = to ? `Conexion verificada y correo enviado a ${to}` : 'Conexion verificada';
    await profile.save();

    res.json({
      success: true,
      data: toSafeSmtpProfile(profile),
      message: profile.lastTestMessage
    });
  } catch (error: any) {
    const profile = await SmtpProfile.findById(req.params.id).select('+passwordEncrypted');
    if (profile) {
      profile.lastTestAt = new Date();
      profile.lastTestSuccess = false;
      profile.lastTestMessage = error?.message || 'Error verificando SMTP';
      await profile.save();
    }

    res.status(400).json({
      success: false,
      error: error?.message || 'Error verificando SMTP'
    });
  }
};

// Obtener las políticas globales del servidor (independientes de los perfiles SMTP)
export const getActiveSmtpPolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    // Leer de la colección global; si no existe, usar defaults
    const policy = await ServerPolicy.findOne();
    res.json({
      success: true,
      data: {
        sendBackupOnDelete: policy ? policy.sendBackupOnDelete : true,
        requirePersonalEmail: policy ? policy.requirePersonalEmail : true
      }
    });
  } catch (error) {
    logger.error('Error al obtener las políticas del servidor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener políticas del servidor'
    });
  }
};

// Actualizar las políticas globales del servidor (upsert: crea si no existe)
export const updateServerPolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sendBackupOnDelete, requirePersonalEmail } = req.body;
    const updateData: Record<string, unknown> = {};

    if (sendBackupOnDelete !== undefined) updateData.sendBackupOnDelete = Boolean(sendBackupOnDelete);
    if (requirePersonalEmail !== undefined) updateData.requirePersonalEmail = Boolean(requirePersonalEmail);
    updateData.updatedBy = req.user?._id;

    // Upsert: actualizar el documento único o crearlo si no existe
    const policy = await ServerPolicy.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        sendBackupOnDelete: policy.sendBackupOnDelete,
        requirePersonalEmail: policy.requirePersonalEmail
      },
      message: 'Políticas del servidor actualizadas correctamente'
    });
  } catch (error) {
    logger.error('Error al actualizar las políticas del servidor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar políticas del servidor'
    });
  }
};
