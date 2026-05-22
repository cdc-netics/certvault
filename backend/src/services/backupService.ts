import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { User } from '../models/User';
import { Certification } from '../models/Certification';
import { SmtpProfile } from '../models/SmtpProfile';
import { BrandingSettings } from '../models/BrandingSettings';
import { AuditLog } from '../models/AuditLog';

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
    // Extraer todo lo que esté bajo "uploads/" en el ZIP hacia el directorio local
    zipEntries.forEach((entry: any) => {
      if (entry.entryName.startsWith('uploads/')) {
        // Remover 'uploads/' de la ruta para extraer correctamente
        const targetPath = entry.entryName.replace(/^uploads\//, '');
        // Si es un directorio y targetPath está vacío, ignorar
        if (!targetPath) return;
        
        // AdmZip extractEntryTo (entryName, targetPath, maintainEntryPath, overwrite)
        zip.extractEntryTo(entry, uploadsDir, true, true);
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

const restoreFullData = async (data: any) => {
  // Opcional: limpiar colecciones antes de importar o hacer upsert
  const collections = data.collections;
  if (!collections) return;

  if (collections.branding) {
    await BrandingSettings.deleteMany({});
    await BrandingSettings.create(collections.branding);
  }

  if (collections.smtpProfiles && Array.isArray(collections.smtpProfiles)) {
    await SmtpProfile.deleteMany({});
    await SmtpProfile.insertMany(collections.smtpProfiles);
  }

  if (collections.users && Array.isArray(collections.users)) {
    // Upsert Users by email to preserve passwords if existing
    for (const u of collections.users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        await User.updateOne({ email: u.email }, { $set: u });
      } else {
        await User.create(u);
      }
    }
  }

  if (collections.certifications && Array.isArray(collections.certifications)) {
    // Reemplazar todas las certificaciones para que coincidan con el backup exactamente
    await Certification.deleteMany({});
    await Certification.insertMany(collections.certifications);
  }

  if (collections.auditLogs && Array.isArray(collections.auditLogs)) {
    // Opcional: restaurar logs de auditoría (podría crecer mucho, lo reemplazamos todo)
    await AuditLog.deleteMany({});
    await AuditLog.insertMany(collections.auditLogs);
  }
};
