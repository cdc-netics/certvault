import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Tipos de imagen admitidos para los avatares y la extensión con la que se almacenan.
 *
 * La extensión NO puede derivarse del tipo declarado en el `data:` URL, porque ese texto lo
 * escribe quien sube el avatar y los avatares sí se sirven como estáticos: un `image/svg`
 * quedaba guardado como `.svg` y se entregaba con `Content-Type: image/svg+xml`, de modo que
 * un SVG con script embebido se ejecutaba en el origen de la aplicación al abrir su URL.
 * Se excluye deliberadamente SVG por ser el único formato de la lista que admite scripts.
 */
const ALLOWED_AVATAR_TYPES: Readonly<Record<string, string>> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const MAX_AVATAR_SIZE_BYTES = Number(process.env.MAX_AVATAR_FILE_SIZE || 2 * 1024 * 1024);

const AVATAR_DATA_URL = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/;

const ensureAvatarDir = (): string => {
  // Ensure avatars are stored alongside the uploads directory served by Express (/backend/uploads)
  const dir = path.resolve(__dirname, '../../uploads/avatars');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const saveBase64Avatar = (dataUrl: string): string => {
  const matches = dataUrl.match(AVATAR_DATA_URL);
  if (!matches) {
    throw new Error('Avatar invalido');
  }

  const declaredType = (matches[1] || '').toLowerCase();
  const base64Data = matches[2] || '';

  const extension = ALLOWED_AVATAR_TYPES[declaredType];
  if (!extension) {
    throw new Error('Formato de avatar no permitido');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0) {
    throw new Error('Avatar invalido');
  }
  if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('El avatar supera el tamaño máximo permitido');
  }

  const dir = ensureAvatarDir();
  const filename = `avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  // Ruta accesible desde el frontend (servida por express.static /uploads)
  const relativeUrl = `/uploads/avatars/${filename}`;
  return relativeUrl;
};
