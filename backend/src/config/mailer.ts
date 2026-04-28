import dns from 'dns';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Cargar .env lo antes posible para que SMTP_HOST exista aunque este archivo se importe antes de server.ts
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: true
});

// Priorizar IPv4 para evitar timeouts en algunos ISP/firewalls
dns.setDefaultResultOrder('ipv4first');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;
const smtpSecure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

export const mailTransport = nodemailer.createTransport({
  host: smtpHost || 'localhost',
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000
});

export const verifyMailer = async (): Promise<void> => {
  try {
    if (!smtpHost) {
      console.warn('SMTP_HOST no esta configurado. Se omitira verificacion del transporte .env.');
      return;
    }
    await mailTransport.verify();
    console.log('Transporte SMTP verificado');
  } catch (error) {
    console.warn('No se pudo verificar SMTP. Se intentara enviar igual.', error);
  }
};
