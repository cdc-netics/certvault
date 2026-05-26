import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { restoreBackup } from '../services/backupService';
import { User } from '../models/User';

// Cargar variables de entorno del archivo .env
dotenv.config();

const testRestore = async () => {
  let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certif-app';
  mongoUri = mongoUri.replace(/\${(\w+)}/g, (_, key) => process.env[key] || '');

  const zipPath = path.join(__dirname, '../../../BAK/certivault-backup-full-restored.zip');

  console.log('=== TESTEANDO RESTAURACIÓN DE BACKUP DESDE ZIP (VÍA APP) ===');
  console.log(`Conectando a base de datos: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida.');

    if (!fs.existsSync(zipPath)) {
      throw new Error(`El archivo ZIP no existe en la ruta: ${zipPath}`);
    }

    const zipBuffer = fs.readFileSync(zipPath);
    console.log('Cargando buffer de ZIP y llamando a restoreBackup()...');

    await restoreBackup(zipBuffer);

    console.log('\n¡Restauración desde el ZIP completada exitosamente!');
    
    // Validar que los usuarios se hayan cargado y tengan el campo password (hash)
    const count = await User.countDocuments();
    console.log(`Total usuarios en BD tras restaurar ZIP: ${count}`);
    
    const sampleUser = await User.findOne({ email: 'admin@empresa.com' }).select('+password');
    if (sampleUser) {
      console.log(`Usuario ejemplo (${sampleUser.email}) verificado.`);
      console.log(`Tiene hash de contraseña: ${sampleUser.password ? 'SÍ (correcto)' : 'NO (error)'}`);
    }

  } catch (error) {
    console.error('Error durante la prueba de restauración de ZIP:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada.');
  }
};

testRestore();
