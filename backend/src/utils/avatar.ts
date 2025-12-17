import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ensureAvatarDir = (): string => {
  // Ensure avatars are stored alongside the uploads directory served by Express (/backend/uploads)
  const dir = path.resolve(__dirname, '../../uploads/avatars');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const saveBase64Avatar = (dataUrl: string): string => {
  const matches = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Avatar invalido');
  }

  const mime = matches[1] || 'image/png';
  const base64Data = matches[2] || '';
  const ext = mime.split('/')[1] || 'png';
  const buffer = Buffer.from(base64Data, 'base64');

  const dir = ensureAvatarDir();
  const filename = `avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  // Ruta accesible desde el frontend (servida por express.static /uploads)
  const relativeUrl = `/uploads/avatars/${filename}`;
  return relativeUrl;
};
