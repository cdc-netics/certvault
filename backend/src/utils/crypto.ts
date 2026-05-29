import crypto from 'crypto';

// Algoritmo de cifrado estándar y robusto para datos confidenciales
const ALGORITHM = 'aes-256-cbc';

// Obtener la clave de cifrado simétrico derivándola con SHA-256 para asegurar 32 bytes
const getEncryptionKey = (): Buffer => {
  const secret = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'certvault-default-secret-key-32-chars';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Cifra un texto en texto plano utilizando AES-256-CBC.
 * Retorna una cadena codificada en formato hexadecimal que contiene el IV y el texto cifrado.
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retornamos el IV y el contenido cifrado concatenados
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Descifra una cadena hexadecimal previamente cifrada con AES-256-CBC.
 * Retorna el texto original en formato plano.
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de texto cifrado inválido');
    }
    
    // Obtenemos IV y texto encriptado usando aserciones de no-nulo para TypeScript
    const ivHex = parts[0]!;
    const encrypted = parts[1]!;
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    // Concatenamos el resultado en un array para evitar problemas de tipos en TS
    const decryptedParts: string[] = [];
    decryptedParts.push(decipher.update(encrypted, 'hex', 'utf8'));
    decryptedParts.push(decipher.final('utf8'));
    
    return decryptedParts.join('');
  } catch (error) {
    console.error('Error al descifrar la información:', error);
    // Devolvemos el texto original en caso de error o si no estaba cifrado para evitar caídas de ejecución
    return encryptedText;
  }
};
