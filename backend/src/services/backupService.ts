import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { BrandingSettings } from '../models/BrandingSettings';
import { AuditLog } from '../models/AuditLog';
import { PublicApiClient } from '../models/PublicApiClient';

// Generar backup solo de configuraciones (Branding, SmtpProfiles)
export const generateConfigBackup = async (): Promise<Buffer> => {
  const zip = new AdmZip();
  const smtpProfiles = await SmtpProfile.find().select('+passwordEncrypted').lean();
  const branding = await BrandingSettings.findOne().sort({ updatedAt: -1 }).lean();

  const configData = {
    type: 'config',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    collections: {
      smtpProfiles: smtpProfiles.map(profile => ({
        ...profile,
        passwordEncrypted: profile.passwordEncrypted ? '[encrypted-secret-exported]' : undefined
      })),
      branding
    }
  };

  zip.addFile('config.json', Buffer.from(JSON.stringify(configData, null, 2), 'utf8'));
  return zip.toBuffer();
};

// Generar backup completo (Todo el JSON + carpeta uploads)
export const generateFullBackup = async (): Promise<Buffer> => {
  const zip = new AdmZip();
  
  // 1. Obtener datos de MongoDB
  const [users, certifications, smtpProfiles, branding, auditLogs] = await Promise.all([
    User.find().select('-password -refreshToken -passwordResetToken -verificationToken').lean(),
    Certification.find().lean(),
    SmtpProfile.find().select('+passwordEncrypted').lean(),
    BrandingSettings.findOne().sort({ updatedAt: -1 }).lean(),
    AuditLog.find().lean()
  ]);

  const fullData = {
    type: 'full',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    collections: {
      users,
      certifications,
      smtpProfiles: smtpProfiles.map(profile => ({
        ...profile,
        passwordEncrypted: profile.passwordEncrypted ? '[encrypted-secret-exported]' : undefined
      })),
      branding,
      auditLogs
    }
  };

  zip.addFile('database.json', Buffer.from(JSON.stringify(fullData, null, 2), 'utf8'));

  // 2. Añadir la carpeta de uploads si existe
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (fs.existsSync(uploadsDir)) {
    zip.addLocalFolder(uploadsDir, 'uploads');
  }

  return zip.toBuffer();
};

// Restaurar un backup desde un buffer
export const restoreBackup = async (zipBuffer: Buffer): Promise<void> => {
  const zip = new AdmZip(zipBuffer);
  
  // Determinar si es un backup de config o completo
  const zipEntries = zip.getEntries();
  const isConfig = zipEntries.some(entry => entry.entryName === 'config.json');
  const isFull = zipEntries.some(entry => entry.entryName === 'database.json');

  if (!isConfig && !isFull) {
    throw new Error('El archivo ZIP no contiene un formato válido (falta config.json o database.json)');
  }

  if (isConfig) {
    const configEntry = zip.getEntry('config.json');
    if (!configEntry) throw new Error('config.json no encontrado en el ZIP');
    
    const data = JSON.parse(zip.readAsText(configEntry));
    await restoreConfigData(data);
  } else {
    const fullEntry = zip.getEntry('database.json');
    if (!fullEntry) throw new Error('database.json no encontrado en el ZIP');
    
    const data = JSON.parse(zip.readAsText(fullEntry));
    await restoreFullData(data);

    // Restaurar carpeta de uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    // Extraer todo lo que esté bajo "uploads/" en el ZIP hacia el directorio local sin duplicar directorios
    zipEntries.forEach((entry: any) => {
      if (entry.entryName.startsWith('uploads/')) {
        // Remover 'uploads/' de la ruta para extraer correctamente
        const targetPath = entry.entryName.replace(/^uploads\//, '');
        if (!targetPath) return;
        
        const destPath = path.join(uploadsDir, targetPath);
        if (entry.isDirectory) {
          fs.mkdirSync(destPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, entry.getData());
        }
      }
    });
  }
};

const restoreConfigData = async (data: any) => {
  if (data.collections?.branding) {
    await BrandingSettings.deleteMany({});
    await BrandingSettings.create(data.collections.branding);
  }
  if (data.collections?.smtpProfiles) {
    await SmtpProfile.deleteMany({});
    // Insertamos tal cual (las contraseñas encriptadas están marcadas, deberíamos ignorarlas o restaurarlas si existen).
    // Para simplificar, insertamos el perfil (requerirá nueva contraseña en UI).
    await SmtpProfile.insertMany(data.collections.smtpProfiles);
  }
};

export const restoreFullData = async (data: any) => {
  const collections = data.collections;
  if (!collections) return;

  if (collections.branding) {
    await BrandingSettings.deleteMany({});
    const brandingDoc = { ...collections.branding };
    if (brandingDoc._id && typeof brandingDoc._id === 'string') {
      brandingDoc._id = new mongoose.Types.ObjectId(brandingDoc._id);
    }
    if (brandingDoc.createdAt) brandingDoc.createdAt = new Date(brandingDoc.createdAt);
    if (brandingDoc.updatedAt) brandingDoc.updatedAt = new Date(brandingDoc.updatedAt);
    
    await BrandingSettings.collection.insertOne(brandingDoc);
  }

  if (collections.smtpProfiles && Array.isArray(collections.smtpProfiles)) {
    await SmtpProfile.deleteMany({});
    if (collections.smtpProfiles.length > 0) {
      const docs = collections.smtpProfiles.map((doc: any) => {
        const newDoc = { ...doc };
        if (newDoc._id && typeof newDoc._id === 'string') {
          newDoc._id = new mongoose.Types.ObjectId(newDoc._id);
        }
        if (newDoc.createdAt) newDoc.createdAt = new Date(newDoc.createdAt);
        if (newDoc.updatedAt) newDoc.updatedAt = new Date(newDoc.updatedAt);
        return newDoc;
      });
      await SmtpProfile.collection.insertMany(docs);
    }
  }

  if (collections.users && Array.isArray(collections.users)) {
    // Restaurar usuarios directamente a nivel de base de datos nativa para preservar contraseñas
    for (const u of collections.users) {
      const userDoc = { ...u };
      if (userDoc._id && typeof userDoc._id === 'string') {
        userDoc._id = new mongoose.Types.ObjectId(userDoc._id);
      }
      if (userDoc.createdBy && typeof userDoc.createdBy === 'string') {
        userDoc.createdBy = new mongoose.Types.ObjectId(userDoc.createdBy);
      }
      if (userDoc.createdAt) userDoc.createdAt = new Date(userDoc.createdAt);
      if (userDoc.updatedAt) userDoc.updatedAt = new Date(userDoc.updatedAt);
      if (userDoc.lastLogin) userDoc.lastLogin = new Date(userDoc.lastLogin);

      await User.collection.updateOne(
        { email: u.email },
        { $set: userDoc },
        { upsert: true }
      );
    }
  }

  if (collections.certifications && Array.isArray(collections.certifications)) {
    await Certification.deleteMany({});
    if (collections.certifications.length > 0) {
      const docs = collections.certifications.map((doc: any) => {
        const newDoc = { ...doc };
        // Convertir IDs principales y de auditoría de texto a ObjectId nativo
        if (newDoc._id && typeof newDoc._id === 'string') {
          newDoc._id = new mongoose.Types.ObjectId(newDoc._id);
        }
        if (newDoc.employeeId && typeof newDoc.employeeId === 'string') {
          newDoc.employeeId = new mongoose.Types.ObjectId(newDoc.employeeId);
        }
        if (newDoc.userId && typeof newDoc.userId === 'string') {
          newDoc.userId = new mongoose.Types.ObjectId(newDoc.userId);
        }
        if (newDoc.createdBy && typeof newDoc.createdBy === 'string') {
          newDoc.createdBy = new mongoose.Types.ObjectId(newDoc.createdBy);
        }
        if (newDoc.updatedBy && typeof newDoc.updatedBy === 'string') {
          newDoc.updatedBy = new mongoose.Types.ObjectId(newDoc.updatedBy);
        }
        // Convertir fechas de texto ISO a tipo Date de MongoDB
        if (newDoc.issueDate) newDoc.issueDate = new Date(newDoc.issueDate);
        if (newDoc.expirationDate) newDoc.expirationDate = new Date(newDoc.expirationDate);
        if (newDoc.issuedDate) newDoc.issuedDate = new Date(newDoc.issuedDate);
        if (newDoc.expiryDate) newDoc.expiryDate = new Date(newDoc.expiryDate);
        if (newDoc.createdAt) newDoc.createdAt = new Date(newDoc.createdAt);
        if (newDoc.updatedAt) newDoc.updatedAt = new Date(newDoc.updatedAt);
        return newDoc;
      });
      await Certification.collection.insertMany(docs);
    }
  }

  if (collections.auditLogs && Array.isArray(collections.auditLogs)) {
    await AuditLog.deleteMany({});
    if (collections.auditLogs.length > 0) {
      const docs = collections.auditLogs.map((doc: any) => {
        const newDoc = { ...doc };
        if (newDoc._id && typeof newDoc._id === 'string') {
          newDoc._id = new mongoose.Types.ObjectId(newDoc._id);
        }
        if (newDoc.userId && typeof newDoc.userId === 'string') {
          newDoc.userId = new mongoose.Types.ObjectId(newDoc.userId);
        }
        if (newDoc.createdAt) newDoc.createdAt = new Date(newDoc.createdAt);
        return newDoc;
      });
      await AuditLog.collection.insertMany(docs);
    }
  }
};

// Borrar todo el sistema excepto el administrador por defecto
export const systemWipe = async (): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@empresa.com';

  // 1. Eliminar todos los usuarios EXCEPTO el admin
  await User.deleteMany({ email: { $ne: adminEmail } });

  // 2. Limpiar otras colecciones
  await Certification.deleteMany({});
  await SmtpProfile.deleteMany({});
  await BrandingSettings.deleteMany({});
  await AuditLog.deleteMany({});
  await PublicApiClient.deleteMany({});
};
