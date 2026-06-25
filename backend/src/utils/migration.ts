import mongoose from 'mongoose';
import { User } from '../models/User';
import { Certification } from '../models/Certification';
import { Department } from '../models/Department';
import { Position } from '../models/Position';
import { resolveDepartment, resolvePosition } from './resolveEntities';

// Lista de departamentos por defecto basados en el antiguo enum del sistema
const DEFAULT_DEPARTMENTS = [
  { name: 'Administración', code: 'ADM' },
  { name: 'Infraestructura', code: 'INF' },
  { name: 'Proyectos', code: 'PROY' },
  { name: 'TI', code: 'TI' },
  { name: 'Recursos Humanos', code: 'RRHH' },
  { name: 'Finanzas', code: 'FIN' },
  { name: 'Operaciones', code: 'OPE' },
  { name: 'Ventas', code: 'VEN' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'Ingeniería', code: 'ING' },
  { name: 'Calidad', code: 'CAL' },
  { name: 'Seguridad', code: 'SEG' },
  { name: 'Legal', code: 'LEG' },
  { name: 'Ciberseguridad', code: 'CIBER' }
];

/**
 * Realiza la migración y normalización de la base de datos de strings a referencias Mongoose (ObjectId)
 */
export const runDatabaseMigration = async (): Promise<void> => {
  try {
    console.log('🏁 Iniciando proceso de migración de base de datos...');

    // 1. Sembrar departamentos por defecto si la colección está vacía
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      console.log('🌱 Sembrando departamentos iniciales por defecto...');
      await Department.insertMany(DEFAULT_DEPARTMENTS);
      console.log(`✅ Se sembraron ${DEFAULT_DEPARTMENTS.length} departamentos.`);
    }

    // 2. Sembrar cargos iniciales por defecto basados en los usuarios existentes
    const posCount = await Position.countDocuments();
    if (posCount === 0) {
      console.log('🌱 Sembrando cargos iniciales...');
      // Obtener cargos únicos existentes en los usuarios actuales
      const uniquePositions = await User.distinct('position');
      const positionsToInsert = uniquePositions
        .filter((pos): pos is string => typeof pos === 'string' && pos.trim() !== '')
        .map(name => ({ name: name.trim(), isActive: true }));

      // Si no hay usuarios con cargos, agregar algunos por defecto
      if (positionsToInsert.length === 0) {
        positionsToInsert.push(
          { name: 'Administrador del Sistema', isActive: true },
          { name: 'Jefe de Tecnología', isActive: true },
          { name: 'Desarrollador Senior', isActive: true },
          { name: 'Ingeniero de Calidad', isActive: true },
          { name: 'Ejecutivo de Ventas', isActive: true },
          { name: 'Colaborador', isActive: true }
        );
      }

      await Position.insertMany(positionsToInsert);
      console.log(`✅ Se sembraron ${positionsToInsert.length} cargos.`);
    }

    // 3. Migrar usuarios
    console.log('👥 Iniciando migración de usuarios...');
    const users = await User.find({});
    let usersMigratedCount = 0;

    for (const user of users) {
      let isModified = false;

      // Migrar departamento del usuario
      const currentDept = user.department as any;
      if (currentDept && !mongoose.Types.ObjectId.isValid(String(currentDept))) {
        try {
          const resolvedDeptId = await resolveDepartment(String(currentDept));
          user.department = resolvedDeptId;
          isModified = true;
        } catch (deptErr) {
          console.error(`❌ Error migrando departamento "${currentDept}" para usuario ${user.username}:`, deptErr);
        }
      }

      // Migrar departamentos gestionados (managedDepartments)
      const currentManagedDepts = user.managedDepartments as any[];
      if (currentManagedDepts && Array.isArray(currentManagedDepts) && currentManagedDepts.length > 0) {
        const migratedManagedDepts: mongoose.Types.ObjectId[] = [];
        let managedDeptsChanged = false;

        for (const dept of currentManagedDepts) {
          if (dept && !mongoose.Types.ObjectId.isValid(String(dept))) {
            try {
              const resolvedDeptId = await resolveDepartment(String(dept));
              migratedManagedDepts.push(resolvedDeptId);
              managedDeptsChanged = true;
            } catch (deptErr) {
              console.error(`❌ Error migrando managedDepartment "${dept}" para usuario ${user.username}:`, deptErr);
            }
          } else if (dept) {
            migratedManagedDepts.push(new mongoose.Types.ObjectId(String(dept)));
          }
        }

        if (managedDeptsChanged) {
          user.managedDepartments = migratedManagedDepts;
          isModified = true;
        }
      }

      // Migrar posición/cargo del usuario
      const currentPosition = user.position as any;
      if (currentPosition && !mongoose.Types.ObjectId.isValid(String(currentPosition))) {
        try {
          const resolvedPosId = await resolvePosition(String(currentPosition));
          user.position = resolvedPosId;
          isModified = true;
        } catch (posErr) {
          console.error(`❌ Error migrando cargo "${currentPosition}" para usuario ${user.username}:`, posErr);
        }
      }

      if (isModified) {
        // Deshabilitar la re-encriptación de contraseña durante esta migración de campos
        await User.updateOne({ _id: user._id }, { 
          $set: { 
            department: user.department,
            managedDepartments: user.managedDepartments,
            position: user.position
          } 
        });
        usersMigratedCount++;
      }
    }
    console.log(`✅ Migración de usuarios completada: ${usersMigratedCount} usuarios actualizados.`);

    // 4. Migrar certificaciones
    console.log('📜 Iniciando migración de certificaciones...');
    const certifications = await Certification.find({});
    let certsMigratedCount = 0;

    for (const cert of certifications) {
      const currentDept = cert.department as any;
      if (currentDept && !mongoose.Types.ObjectId.isValid(String(currentDept))) {
        try {
          const resolvedDeptId = await resolveDepartment(String(currentDept));
          await Certification.updateOne({ _id: cert._id }, { $set: { department: resolvedDeptId } });
          certsMigratedCount++;
        } catch (certErr) {
          console.error(`❌ Error migrando departamento "${currentDept}" para certificación ${cert.title}:`, certErr);
        }
      }
    }
    console.log(`✅ Migración de certificaciones completada: ${certsMigratedCount} certificaciones actualizadas.`);
    console.log('🏁 Proceso de migración finalizado exitosamente.');
  } catch (error) {
    console.error('❌ Error catastrófico en la rutina de migración de base de datos:', error);
    throw error;
  }
};
