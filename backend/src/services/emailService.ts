import { readFile } from 'fs/promises';
import path from 'path';
import '../config/mailer';
import { getActiveMailer } from './smtpProfileService';

interface PasswordResetPayload {
  to: string;
  name: string;
  resetLink: string;
  expiresInMinutes: number;
}

let cachedResetTemplate: string | null = null;
let cachedVerifyTemplate: string | null = null;

const getResetTemplate = async (): Promise<string> => {
  if (cachedResetTemplate) return cachedResetTemplate;

  const templatePath = path.resolve(__dirname, '../../resources/email/reset-password.html');
  try {
    cachedResetTemplate = await readFile(templatePath, 'utf8');
    return cachedResetTemplate;
  } catch (error) {
    console.warn('No se pudo cargar la plantilla HTML de reset, usando fallback de texto', error);
    cachedResetTemplate = '';
    return cachedResetTemplate;
  }
};

export const sendPasswordResetEmail = async (payload: PasswordResetPayload): Promise<void> => {
  const mailer = await getActiveMailer();
  await mailer.transporter.verify();
  const template = await getResetTemplate();
  const htmlBody = template
    ? template
        .replace(/{{name}}/g, payload.name)
        .replace(/{{resetLink}}/g, payload.resetLink)
        .replace(/{{expiresIn}}/g, payload.expiresInMinutes.toString())
    : undefined;

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: payload.to,
    subject: 'Restablecer tu contraseña - CertiVault',
    html: htmlBody,
    text: `Hola ${payload.name},

Recibimos una solicitud para restablecer tu contraseña.

Puedes hacerlo aquí: ${payload.resetLink}
El enlace expira en ${payload.expiresInMinutes} minutos.

Si no solicitaste este cambio, ignora este correo.`
  });
};

interface VerifyEmailPayload {
  to: string;
  name: string;
  verifyLink: string;
  expiresInMinutes: number;
}

const getVerifyTemplate = async (): Promise<string> => {
  if (cachedVerifyTemplate) return cachedVerifyTemplate;
  const templatePath = path.resolve(__dirname, '../../resources/email/verify-email.html');
  try {
    cachedVerifyTemplate = await readFile(templatePath, 'utf8');
    return cachedVerifyTemplate;
  } catch (error) {
    console.warn('No se pudo cargar la plantilla HTML de verificación, usando fallback de texto', error);
    cachedVerifyTemplate = '';
    return cachedVerifyTemplate;
  }
};

export const sendVerificationEmail = async (payload: VerifyEmailPayload): Promise<void> => {
  const mailer = await getActiveMailer();
  await mailer.transporter.verify();
  const template = await getVerifyTemplate();
  const htmlBody = template
    ? template
        .replace(/{{name}}/g, payload.name)
        .replace(/{{verifyLink}}/g, payload.verifyLink)
        .replace(/{{expiresIn}}/g, payload.expiresInMinutes.toString())
    : undefined;

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: payload.to,
    subject: 'Confirma tu cuenta - CertiVault',
    html: htmlBody,
    text: `Hola ${payload.name},

Confirma tu cuenta haciendo clic en: ${payload.verifyLink}
El enlace expira en ${payload.expiresInMinutes} minutos.

Si no creaste esta cuenta, ignora este correo.`
  });
};
