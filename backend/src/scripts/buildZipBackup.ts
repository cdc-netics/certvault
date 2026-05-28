import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import AdmZip from 'adm-zip';

// Helper para deserializar un archivo BSON que contiene múltiples documentos concatenados
const BSON = mongoose.mongo.BSON;

function readBsonFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`[Advertencia] Archivo no encontrado: ${filePath}`);
    return [];
  }

  const buffer = fs.readFileSync(filePath);
  const documents: any[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    if (offset + size > buffer.length) {
      throw new Error(`BSON buffer overflow o corrupto en archivo: ${filePath}`);
    }
    const docBuffer = buffer.subarray(offset, offset + size);
    const doc = BSON.deserialize(docBuffer);
    documents.push(doc);
    offset += size;
  }

  return documents;
}

// Helper para convertir tipos especiales de BSON (ObjectId, Date) a tipos primitivos JSON estándar
function sanitizeDoc(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  if (Array.isArray(doc)) {
    return doc.map(sanitizeDoc);
  }
  if (typeof doc === 'object') {
    // Si es ObjectId
    if (doc.constructor && doc.constructor.name === 'ObjectId') {
      return doc.toHexString();
    }
    // Si es una fecha (Date)
    if (doc instanceof Date) {
      return doc.toISOString();
    }
    // Si es un objeto genérico
    const result: any = {};
    for (const key of Object.keys(doc)) {
      result[key] = sanitizeDoc(doc[key]);
    }
    return result;
  }
  return doc;
}

const buildZipBackup = () => {
  const dumpDir = path.join(__dirname, '../../../BAK/extracted/tmp/dump/certiapp');
  const uploadsSourceDir = path.join(__dirname, '../../../BAK/extracted/home/cdc/certvault/backend/uploads');
  const outputZipPath = path.join(__dirname, '../../../BAK/certivault-backup-full-restored.zip');

  console.log('Iniciando conversión de backup manual a formato estándar ZIP...');

  // 1. Cargar colecciones desde archivos BSON
  const rawUsers = readBsonFile(path.join(dumpDir, 'users.bson'));
  const rawCertifications = readBsonFile(path.join(dumpDir, 'certifications.bson'));
  const rawSmtpProfiles = readBsonFile(path.join(dumpDir, 'smtpprofiles.bson'));
  const rawBrandingSettings = readBsonFile(path.join(dumpDir, 'brandingsettings.bson'));
  const rawAuditLogs = readBsonFile(path.join(dumpDir, 'auditlogs.bson'));

  console.log(`Colecciones leídas:
  - Users: ${rawUsers.length}
  - Certifications: ${rawCertifications.length}
  - SmtpProfiles: ${rawSmtpProfiles.length}
  - BrandingSettings: ${rawBrandingSettings.length}
  - AuditLogs: ${rawAuditLogs.length}`);

  // 2. Sanitizar datos
  const sanitizedCertifications = sanitizeDoc(rawCertifications);
  const sanitizedSmtpProfiles = sanitizeDoc(rawSmtpProfiles);
  const sanitizedAuditLogs = sanitizeDoc(rawAuditLogs);
  const branding = rawBrandingSettings.length > 0 ? sanitizeDoc(rawBrandingSettings[0]) : null;

  // Para usuarios, sanitizamos el documento manteniendo el hash del password para restaurarlo
  const sanitizedUsers = rawUsers.map(user => {
    const cleanUser = sanitizeDoc(user);
    // Preservamos cleanUser.password para que pueda ser restaurado
    delete cleanUser.refreshToken;
    delete cleanUser.passwordResetToken;
    delete cleanUser.passwordResetExpires;
    delete cleanUser.verificationToken;
    delete cleanUser.verificationExpires;
    return cleanUser;
  });

  // 3. Estructurar el database.json
  const databaseJsonContent = {
    type: 'full',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    collections: {
      users: sanitizedUsers,
      certifications: sanitizedCertifications,
      smtpProfiles: sanitizedSmtpProfiles,
      branding,
      auditLogs: sanitizedAuditLogs
    }
  };

  // 4. Crear la versión FULL (con uploads)
  const zipFull = new AdmZip();
  console.log('Agregando database.json al ZIP Full...');
  zipFull.addFile('database.json', Buffer.from(JSON.stringify(databaseJsonContent, null, 2), 'utf8'));

  if (fs.existsSync(uploadsSourceDir)) {
    console.log('Agregando archivos de la carpeta uploads al ZIP Full...');
    zipFull.addLocalFolder(uploadsSourceDir, 'uploads');
  } else {
    console.warn(`[Advertencia] Carpeta de uploads no encontrada en la ruta: ${uploadsSourceDir}`);
  }

  console.log(`Guardando ZIP completo en: ${outputZipPath}`);
  zipFull.writeZip(outputZipPath);

  // 5. Crear la versión DB-ONLY (sin uploads, ideal para evitar error 413)
  const dbOnlyZipPath = path.join(__dirname, '../../../BAK/certivault-backup-db-only.zip');
  const zipDbOnly = new AdmZip();
  console.log('Agregando database.json al ZIP DB-Only (súper liviano)...');
  zipDbOnly.addFile('database.json', Buffer.from(JSON.stringify(databaseJsonContent, null, 2), 'utf8'));

  console.log(`Guardando ZIP liviano en: ${dbOnlyZipPath}`);
  zipDbOnly.writeZip(dbOnlyZipPath);

  console.log('¡Proceso de generación de backups completado con éxito!');
};

buildZipBackup();
