import { readFile } from 'fs/promises';
import fs from 'fs';
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
  // Se remueve verify() redundante para optimizar el rendimiento y evitar esperas de conexion duplicadas antes de enviar.
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

interface CertificationSummaryPayload {
  to: string;
  name: string;
  companyEmail: string;
  certifications: Array<{
    title: string;
    provider: string;
    technology: string;
    level: string;
    certificateNumber: string;
    issueDate: Date;
    expirationDate?: Date;
    status: string;
    certificateUrl?: string;
  }>;
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
  // Se remueve verify() redundante para evitar duplicar el handshake TCP y agilizar el registro del usuario.
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

export const sendUserCertificationsArchiveEmail = async (
  payload: CertificationSummaryPayload
): Promise<void> => {
  const mailer = await getActiveMailer();
  // Se remueve verify() para acelerar la generacion y envio del respaldo de certificaciones.

  // Si no se especifica el correo personal de destino, se utiliza el corporativo como fallback
  const recipient = payload.to || payload.companyEmail;
  if (!recipient) {
    throw new Error('No se especificó una dirección de correo válida para enviar el respaldo');
  }

  const formatDate = (date?: Date | string | null): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    try {
      return d.toISOString().slice(0, 10);
    } catch {
      return 'N/A';
    }
  };

  const rowsHtml = payload.certifications
    .map(
      (cert) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${cert.title}</td>
          <td style="padding:8px;border:1px solid #ddd;">${cert.provider}</td>
          <td style="padding:8px;border:1px solid #ddd;">${cert.technology}</td>
          <td style="padding:8px;border:1px solid #ddd;">${cert.level}</td>
          <td style="padding:8px;border:1px solid #ddd;">${cert.certificateNumber}</td>
          <td style="padding:8px;border:1px solid #ddd;">${formatDate(cert.issueDate)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${formatDate(cert.expirationDate)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${cert.status}</td>
        </tr>
      `
    )
    .join('');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Certificaciones exportadas</h2>
      <p>Hola ${payload.name},</p>
      <p>
        Tu usuario asociado al correo corporativo <strong>${payload.companyEmail}</strong> fue eliminado.
        Como respaldo, te enviamos el listado de tus certificaciones al correo personal.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;border:1px solid #ddd;">Titulo</th>
            <th style="padding:8px;border:1px solid #ddd;">Proveedor</th>
            <th style="padding:8px;border:1px solid #ddd;">Tecnologia</th>
            <th style="padding:8px;border:1px solid #ddd;">Nivel</th>
            <th style="padding:8px;border:1px solid #ddd;">Nro Certificado</th>
            <th style="padding:8px;border:1px solid #ddd;">Emision</th>
            <th style="padding:8px;border:1px solid #ddd;">Expiracion</th>
            <th style="padding:8px;border:1px solid #ddd;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  const textBody = `Hola ${payload.name},\n\n` +
    `Tu usuario corporativo (${payload.companyEmail}) fue eliminado.\n` +
    `Te enviamos tus certificaciones al correo personal como respaldo.\n\n` +
    payload.certifications
      .map(
        (cert, index) =>
          `${index + 1}. ${cert.title} | ${cert.provider} | ${cert.technology} | ${cert.level} | ` +
          `Nro: ${cert.certificateNumber} | Emision: ${formatDate(cert.issueDate)} | ` +
          `Expiracion: ${formatDate(cert.expirationDate)} | Estado: ${cert.status}`
      )
      .join('\n');

  // Recolectar y adjuntar los archivos físicos de certificados del disco.
  // Se utiliza __dirname de forma absoluta para garantizar la resolución correcta tanto en desarrollo como en producción (dist/).
  const attachments: any[] = [];
  payload.certifications.forEach(cert => {
    if (cert.certificateUrl && cert.certificateUrl.startsWith('/uploads/certificates/')) {
      const fileName = path.basename(cert.certificateUrl);
      const filePath = path.resolve(__dirname, '../../uploads/certificates', fileName);
      if (fs.existsSync(filePath)) {
        attachments.push({
          filename: `${cert.title.replace(/[^a-zA-Z0-9]/g, '_')}${path.extname(fileName)}`,
          path: filePath
        });
      }
    }
  });

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: recipient,
    subject: 'Respaldo de certificaciones - CertiVault',
    html: htmlBody,
    text: textBody,
    attachments
  });
};

interface PasswordExpirationPayload {
  to: string;
  name: string;
  daysRemaining: number;
}

export const sendPasswordExpirationWarningEmail = async (
  payload: PasswordExpirationPayload
): Promise<void> => {
  const mailer = await getActiveMailer();
  // Se remueve verify() redundante para optimizar la ejecucion del cron de expiraciones.

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Tu contraseña de CertiVault va a expirar</h2>
      <p>Hola ${payload.name},</p>
      <p>
        Te informamos que tu contraseña del sistema expirará en <strong>${payload.daysRemaining}</strong> ${payload.daysRemaining === 1 ? 'día' : 'días'}.
      </p>
      <p>
        Por favor, ingresa al sistema y actualiza tu contraseña desde tu menú de perfil para evitar perder el acceso.
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.8rem; color: #666;">
        Este es un aviso automático de seguridad, por favor no respondas a este correo.
      </p>
    </div>
  `;

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: payload.to,
    subject: `Aviso: Tu contraseña expira en ${payload.daysRemaining} ${payload.daysRemaining === 1 ? 'día' : 'días'} - CertiVault`,
    html: htmlBody,
    text: `Hola ${payload.name},\n\nTe informamos que tu contraseña del sistema expirará en ${payload.daysRemaining} ${payload.daysRemaining === 1 ? 'día' : 'días'}.\n\nPor favor, ingresa al sistema y actualízala desde tu perfil.`
  });
};

interface CertificateExpirationPayload {
  to: string;
  name: string;
  certificateTitle: string;
  daysRemaining: number;
  expirationDate: Date;
}

// Envía un correo electrónico alertando al usuario sobre el vencimiento próximo de su certificado
export const sendCertificateExpirationWarningEmail = async (
  payload: CertificateExpirationPayload
): Promise<void> => {
  const mailer = await getActiveMailer();

  const formattedDate = new Date(payload.expirationDate).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Alerta de vencimiento de certificado - CertiVault</h2>
      <p>Hola ${payload.name},</p>
      <p>
        Te informamos que tu certificado <strong>"${payload.certificateTitle}"</strong> está próximo a vencer.
      </p>
      <p>
        Días restantes: <strong>${payload.daysRemaining}</strong> ${payload.daysRemaining === 1 ? 'día' : 'días'}.<br/>
        Fecha de vencimiento: <strong>${formattedDate}</strong>.
      </p>
      <p>
        Por favor, ingresa al sistema y toma las medidas necesarias para su renovación o actualización.
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.8rem; color: #666;">
        Este es un aviso automático de seguridad, por favor no respondas a este correo.
      </p>
    </div>
  `;

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: payload.to,
    subject: `Alerta: Tu certificado "${payload.certificateTitle}" vence en ${payload.daysRemaining} días - CertiVault`,
    html: htmlBody,
    text: `Hola ${payload.name},\n\nTe informamos que tu certificado "${payload.certificateTitle}" está próximo a vencer en ${payload.daysRemaining} días (Fecha de vencimiento: ${formattedDate}).\n\nPor favor, ingresa al sistema para revisarlo.`
  });
};
