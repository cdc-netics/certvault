import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { database } from '../config/database';
import { User } from '../models/User';
import { Certification } from '../models/Certification';

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Expandir variables de entorno
for (let pass = 0; pass < 3; pass++) {
  let changed = false;
  for (const key in process.env) {
    const val = process.env[key];
    if (val && typeof val === 'string' && val.includes('${')) {
      const newVal = val.replace(/\${(\w+)}/g, (_, name) => process.env[name] || '');
      if (newVal !== val) {
        process.env[key] = newVal;
        changed = true;
      }
    }
  }
  if (!changed) break;
}

// Redirigir a 127.0.0.1 si apunta a docker host
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo:')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo:', '//127.0.0.1:');
} else if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo/')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo/', '//127.0.0.1/');
}

async function runHealer() {
  console.log('🔌 Conectando a la base de datos...');
  await database.connect();

  try {
    const users = await User.find({ isActive: true });
    console.log(`🔍 Se encontraron ${users.length} usuarios activos en el sistema.`);

    let totalHealed = 0;

    for (const user of users) {
      const fullName = `${user.firstName} ${user.lastName}`.trim().toLowerCase();
      if (!fullName) continue;

      // Buscar certificaciones que tengan este nombre de empleado pero diferente o ningún employeeId
      const certs = await Certification.find({
        employeeName: { $regex: new RegExp(`^${fullName.replace(/\s+/g, '\\s+')}$`, 'i') }
      });

      let userHealedCount = 0;

      for (const cert of certs) {
        const certEmployeeIdStr = cert.employeeId ? cert.employeeId.toString() : '';
        const userObjectIdStr = user._id.toString();

        if (certEmployeeIdStr !== userObjectIdStr) {
          // Actualizar el employeeId y también el department si es necesario
          await Certification.updateOne(
            { _id: cert._id },
            { 
              $set: { 
                employeeId: user._id,
                department: user.department 
              } 
            }
          );
          userHealedCount++;
          totalHealed++;
        }
      }

      if (userHealedCount > 0) {
        console.log(`✅ Re-asociadas ${userHealedCount} certificaciones para el usuario "${user.firstName} ${user.lastName}" (ID: ${user._id})`);
      }
    }

    console.log(`\n🎉 Proceso de curación completado. Se repararon ${totalHealed} certificaciones en total.`);
  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos.');
  }
}

runHealer();
