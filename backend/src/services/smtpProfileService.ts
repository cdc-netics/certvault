import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { SentMessageInfo, Transporter } from 'nodemailer';
import { ISmtpProfile, SmtpProfile } from '../models/SmtpProfile';

export interface SmtpProfileInput {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  rejectUnauthorized?: boolean;
  connectionTimeout?: number;
}

export interface MailerContext {
  transporter: Transporter<SentMessageInfo>;
  from: string;
  source: 'profile' | 'env';
  profile?: ISmtpProfile;
}

const algorithm = 'aes-256-gcm';

const getEncryptionKey = (): Buffer => {
  const secret = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SMTP_ENCRYPTION_KEY o JWT_SECRET debe estar configurado');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptSecret = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptSecret = (value: string): string => {
  const [ivValue, authTagValue, encryptedValue] = value.split(':');
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error('Credencial SMTP invalida');
  }

  const decipher = crypto.createDecipheriv(algorithm, getEncryptionKey(), Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final()
  ]).toString('utf8');
};

const buildFrom = (fromName: string, fromEmail: string): string => {
  return fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>` : fromEmail;
};

export const buildTransportFromProfile = (profile: ISmtpProfile): MailerContext => {
  const password = profile.passwordEncrypted ? decryptSecret(profile.passwordEncrypted) : undefined;
  const transporter = nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    auth: profile.username && password ? { user: profile.username, pass: password } : undefined,
    tls: {
      rejectUnauthorized: profile.rejectUnauthorized
    },
    connectionTimeout: profile.connectionTimeout
  });

  return {
    transporter,
    from: buildFrom(profile.fromName, profile.fromEmail),
    source: 'profile',
    profile
  };
};

const buildTransportFromEnv = (): MailerContext => {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    throw new Error('No hay perfil SMTP activo y SMTP_HOST no esta configurado');
  }

  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpSecure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const from = process.env.SMTP_FROM || 'CertiVault';

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000
    }),
    from,
    source: 'env'
  };
};

export const getActiveMailer = async (): Promise<MailerContext> => {
  const activeProfile = await SmtpProfile.findOne({ isActive: true }).select('+passwordEncrypted');
  if (activeProfile) {
    return buildTransportFromProfile(activeProfile);
  }

  return buildTransportFromEnv();
};

export const setActiveSmtpProfile = async (profileId: string): Promise<ISmtpProfile | null> => {
  const profile = await SmtpProfile.findById(profileId);
  if (!profile) return null;

  await SmtpProfile.updateMany({ _id: { $ne: profile._id } }, { $set: { isActive: false } });
  profile.isActive = true;
  await profile.save();
  return profile;
};

export const toSafeSmtpProfile = (profile: ISmtpProfile) => ({
  id: profile._id,
  name: profile.name,
  host: profile.host,
  port: profile.port,
  secure: profile.secure,
  username: profile.username,
  hasPassword: Boolean(profile.passwordEncrypted),
  fromName: profile.fromName,
  fromEmail: profile.fromEmail,
  isActive: profile.isActive,
  rejectUnauthorized: profile.rejectUnauthorized,
  connectionTimeout: profile.connectionTimeout,
  lastTestAt: profile.lastTestAt,
  lastTestSuccess: profile.lastTestSuccess,
  lastTestMessage: profile.lastTestMessage,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});
