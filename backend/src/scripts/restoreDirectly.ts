import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { BrandingSettings } from '../models/BrandingSettings';
import { AuditLog } from '../models/AuditLog';

// Cargar variables de entorno del archivo .env
dotenv.config();

const BSON = mongoose.mongo.BSON;

// Helper para deserializar un archivo BSON
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

// Función para copiar directorios de manera recursiva
function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const restoreDirectly = async () => {
  let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certif-app';
  // Resolver variables interpoladas como ${MONGO_PORT}
  mongoUri = mongoUri.replace(/\${(\w+)}/g, (_, key) => process.env[key] || '');

  const dumpDir = path.join(__dirname, '../../../BAK/extracted/tmp/dump/certiapp');
  const uploadsSourceDir = path.join(__dirname, '../../../BAK/extracted/home/cdc/certvault/backend/uploads');
  const uploadsTargetDir = path.join(__dirname, '../../uploads');

  console.log('=== INICIANDO RESTAURACIÓN DIRECTA DESDE BACKUP MANUAL ===');
  console.log(`Conectando a base de datos: ${mongoUri}`);

  try {
    // 1. Conectar a MongoDB
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida correctamente.');

    // 2. Leer archivos BSON
    console.log('Leyendo colecciones del dump...');
    const users = readBsonFile(path.join(dumpDir, 'users.bson'));
    const certifications = readBsonFile(path.join(dumpDir, 'certifications.bson'));
    const smtpProfiles = readBsonFile(path.join(dumpDir, 'smtpprofiles.bson'));
    const brandingSettings = readBsonFile(path.join(dumpDir, 'brandingsettings.bson'));
    const auditLogs = readBsonFile(path.join(dumpDir, 'auditlogs.bson'));

    // 3. Restaurar Base de Datos (Limpiar colecciones existentes y cargar datos)
    // Usamos validateBeforeSave: false para preservar las contraseñas originales (hashes bcrypt)
    // sin que el middleware pre('save') vuelva a encriptarlas ni lance errores de validación.

    console.log('\n--- Restaurando Colección: Users ---');
    await User.deleteMany({});
    if (users.length > 0) {
      await User.collection.insertMany(users);
      console.log(`Se restauraron ${users.length} usuarios (incluyendo hashes de contraseñas intactos).`);
    } else {
      console.log('No se encontraron usuarios para restaurar.');
    }

    console.log('\n--- Restaurando Colección: Certifications ---');
    await Certification.deleteMany({});
    if (certifications.length > 0) {
      await Certification.collection.insertMany(certifications);
      console.log(`Se restauraron ${certifications.length} certificaciones.`);
    } else {
      console.log('No se encontraron certificaciones para restaurar.');
    }

    console.log('\n--- Restaurando Colección: SmtpProfiles ---');
    await SmtpProfile.deleteMany({});
    if (smtpProfiles.length > 0) {
      await SmtpProfile.collection.insertMany(smtpProfiles);
      console.log(`Se restauraron ${smtpProfiles.length} perfiles SMTP.`);
    } else {
      console.log('No se encontraron perfiles SMTP.');
    }

    console.log('\n--- Restaurando Colección: BrandingSettings ---');
    await BrandingSettings.deleteMany({});
    if (brandingSettings.length > 0) {
      await BrandingSettings.collection.insertMany(brandingSettings);
      console.log(`Se restauraron ${brandingSettings.length} configuraciones de branding.`);
    } else {
      console.log('No se encontró configuración de branding.');
    }

    console.log('\n--- Restaurando Colección: AuditLogs ---');
    await AuditLog.deleteMany({});
    if (auditLogs.length > 0) {
      await AuditLog.collection.insertMany(auditLogs);
      console.log(`Se restauraron ${auditLogs.length} registros de auditoría.`);
    } else {
      console.log('No se encontraron registros de auditoría.');
    }

    // 4. Restaurar Archivos de Uploads
    console.log('\n--- Restaurando archivos adjuntos (Uploads) ---');
    if (fs.existsSync(uploadsSourceDir)) {
      console.log(`Copiando archivos desde:\n  ${uploadsSourceDir}\nhacia:\n  ${uploadsTargetDir}`);
      copyDirRecursive(uploadsSourceDir, uploadsTargetDir);
      console.log('Archivos de uploads copiados y restaurados exitosamente.');
    } else {
      console.warn('[Advertencia] No se encontró la carpeta uploads del backup manual para copiar.');
    }

    console.log('\n======================================================');
    console.log('¡RESTAURACIÓN DIRECTA COMPLETADA CON ÉXITO AL 100%!');
    console.log('======================================================');

  } catch (error) {
    console.error('Error durante la restauración directa:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada.');
  }
};

restoreDirectly();
