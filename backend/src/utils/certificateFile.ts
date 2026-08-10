import path from 'path';

/**
 * Tipos de archivo admitidos para los certificados y su extensión canónica.
 *
 * El `Content-Type` con el que se entrega un certificado NO debe deducirse de la extensión
 * del archivo subido: esa extensión la elige quien sube el archivo. Si se le permite fijar
 * `.html`, la respuesta se sirve como `text/html` y el navegador la ejecuta en el origen de
 * la aplicación, convirtiendo un certificado en un XSS almacenado. Esta tabla es la única
 * fuente de verdad tanto para aceptar la subida como para responder la descarga.
 */
const CERTIFICATE_FILE_TYPES: ReadonlyArray<{ mimeType: string; extensions: string[] }> = [
  { mimeType: 'application/pdf', extensions: ['.pdf'] },
  { mimeType: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  { mimeType: 'image/png', extensions: ['.png'] }
];

export const ALLOWED_CERTIFICATE_MIME_TYPES = CERTIFICATE_FILE_TYPES.map((type) => type.mimeType);

const normalizeExtension = (fileName: string): string => path.extname(fileName).toLowerCase();

/**
 * Extensión canónica del tipo declarado, o `null` si el tipo no está admitido. Se usa al
 * guardar para que el nombre en disco no arrastre la extensión elegida por el cliente.
 */
export const canonicalExtensionForMimeType = (mimeType: string): string | null =>
  CERTIFICATE_FILE_TYPES.find((type) => type.mimeType === mimeType)?.extensions[0] ?? null;

/**
 * Verifica que la extensión declarada sea coherente con el tipo MIME. El tipo MIME viaja en
 * la cabecera del multipart y lo controla el cliente, así que exigir la correspondencia
 * cierra el paso a un archivo ejecutable disfrazado de PDF.
 */
export const isConsistentCertificateUpload = (mimeType: string, originalName: string): boolean => {
  const declaredType = CERTIFICATE_FILE_TYPES.find((type) => type.mimeType === mimeType);
  if (!declaredType) {
    return false;
  }
  return declaredType.extensions.includes(normalizeExtension(originalName));
};

/**
 * Tipo de contenido con el que se debe responder un certificado almacenado, o `null` si su
 * extensión no corresponde a ningún tipo admitido. Un `null` debe traducirse en un rechazo:
 * significa que el archivo entró antes de que existiera esta validación.
 */
export const resolveCertificateContentType = (fileName: string): string | null => {
  const extension = normalizeExtension(fileName);
  return CERTIFICATE_FILE_TYPES.find((type) => type.extensions.includes(extension))?.mimeType ?? null;
};

/**
 * Sanea el nombre sugerido al descargar. `Content-Disposition` solo admite caracteres
 * latin1: un título con raya, comillas tipográficas o emoji hacía que `res.setHeader`
 * lanzara `ERR_INVALID_CHAR` y la descarga terminara en un 500 permanente.
 */
export const toSafeDownloadName = (rawName: string, extension: string): string => {
  const sanitized = rawName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Elimina las tildes ya descompuestas: "Certificación" -> "Certificacion".
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, 120);

  return `${sanitized || 'certificado'}${extension}`;
};
