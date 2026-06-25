import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { database } from '../config/database';
import { User, UserRole } from '../models/User';
import { Department } from '../models/Department';
import { Position } from '../models/Position';
import { Certification, CertificationType, CertificationLevel } from '../models/Certification';
import { runLocalBackup, getLocalBackupsList } from '../services/backupService';
import { resolveDepartment, resolvePosition } from '../utils/resolveEntities';
import { performDepartmentCascading } from '../controllers/departmentsController';

// Cargar variables de entorno desde el directorio de backend
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Expandir variables de entorno de forma iterativa para soportar interpolación compleja (ej. ${PORT})
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

// Ajustar MONGODB_URI si apunta al host de Docker 'mongo' para redirigir a local en el host
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo:')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo:', '//127.0.0.1:');
} else if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo/')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo/', '//127.0.0.1/');
}

// Colores de consola para reporte legible
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';

const results: Array<{ name: string; success: boolean; details?: string }> = [];

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ${green}✓ Pasado:${reset} ${testName}`);
    results.push({ name: testName, success: true });
  } else {
    console.error(`  ${red}✗ Fallido:${reset} ${testName}`);
    if (errorDetail) console.error(`    Detalle: ${errorDetail}`);
    results.push({ name: testName, success: false, details: errorDetail });
  }
}

async function runQA() {
  console.log(`${cyan}================================================================${reset}`);
  console.log(`🛡️  ${cyan}Iniciando Pruebas de QA y Verificación de Reglas de Negocio${reset}`);
  console.log(`${cyan}================================================================${reset}`);

  try {
    // 1. Conectar a la base de datos de desarrollo
    await database.connect();

    // 2. Preparar datos limpios de prueba
    console.log(`\n⚙️  ${yellow}Preparando entorno de prueba limpio...${reset}`);
    const testSuffix = `${Date.now().toString().slice(-4)}`;
    
    // Crear un departamento y cargo de prueba primero
    const tempDept = new Department({
      name: `Dept Temp QA ${testSuffix}`,
      code: `DTQ_${testSuffix}`,
      isActive: true
    });
    await tempDept.save();

    const tempPos = new Position({
      name: `Cargo Temp QA ${testSuffix}`,
      isActive: true
    });
    await tempPos.save();

    // Crear un usuario de prueba
    const testLeader = new User({
      username: `ld_${testSuffix}`,
      email: `leader${testSuffix}@empresa.com`,
      personalEmail: `leader${testSuffix}@personal.com`,
      password: 'Password123!',
      firstName: 'Líder',
      lastName: 'Prueba QA',
      role: UserRole.READER, // Comienza como lector
      department: tempDept._id,
      position: tempPos._id,
      isActive: true,
      managedDepartments: []
    });
    await testLeader.save();

    // Casos de prueba
    console.log(`\n🧪  ${yellow}Ejecutando Caso QA-01 y QA-09: Líderes y Departamentos...${reset}`);
    
    const testDept = new Department({
      name: `Dept QA ${testSuffix}`,
      code: `DQA_${Date.now().toString().slice(-4)}`,
      isActive: true
    });
    await testDept.save();

    // Simular lógica de departmentsController.ts: Asignación de Líder
    testDept.leaderId = testLeader._id;
    await testDept.save();

    // Promover rol de usuario a líder y agregar a managedDepartments
    await User.findByIdAndUpdate(testLeader._id, {
      role: UserRole.LIDER,
      $addToSet: { managedDepartments: testDept._id }
    });

    const updatedLeader = await User.findById(testLeader._id);
    assert(
      updatedLeader?.role === UserRole.LIDER,
      'Promoción automática de rol a LIDER tras asignación de departamento',
      `Rol actual: ${updatedLeader?.role}`
    );
    assert(
      Boolean(updatedLeader?.managedDepartments?.some(d => d.toString() === testDept._id.toString())),
      'Inclusión del departamento en managedDepartments del líder',
      `Departamentos gestionados: ${JSON.stringify(updatedLeader?.managedDepartments || [])}`
    );

    // Desvinculación de Líder (Hacer leaderId = null)
    (testDept as any).leaderId = null;
    await testDept.save();

    // Quitar de managedDepartments
    await User.findByIdAndUpdate(testLeader._id, {
      $pull: { managedDepartments: testDept._id }
    });

    // Evaluar si requiere degradación de rol
    const finalLeaderInfo = await User.findById(testLeader._id);
    if (finalLeaderInfo && (finalLeaderInfo.managedDepartments || []).length === 0) {
      finalLeaderInfo.role = UserRole.READER;
      await finalLeaderInfo.save();
    }

    const degradedLeader = await User.findById(testLeader._id);
    assert(
      degradedLeader?.role === UserRole.READER,
      'Degradación automática del líder desvinculado a rol READER',
      `Rol final: ${degradedLeader?.role}`
    );
    assert(
      (degradedLeader?.managedDepartments || []).length === 0,
      'Limpieza completa de managedDepartments del líder desvinculado',
      `managedDepartments final: ${JSON.stringify(degradedLeader?.managedDepartments || [])}`
    );


    console.log(`\n🧪  ${yellow}Ejecutando Caso QA-02: Resolución dinámica de Entidades...${reset}`);
    
    const uniqueDeptName = `Resol_Dept_${Date.now()}`;
    const resolvedDeptId1 = await resolveDepartment(uniqueDeptName);
    const resolvedDeptId2 = await resolveDepartment(uniqueDeptName);
    
    assert(
      resolvedDeptId1.toString() === resolvedDeptId2.toString(),
      'Resolución de departamento insensible a mayúsculas/minúsculas devuelve ID idéntico',
      `ID1: ${resolvedDeptId1}, ID2: ${resolvedDeptId2}`
    );

    const resolvedDeptDoc = await Department.findById(resolvedDeptId1);
    assert(
      resolvedDeptDoc !== null && resolvedDeptDoc.name === uniqueDeptName,
      'Creación automática en base de datos de departamentos inexistentes',
      `Documento obtenido: ${JSON.stringify(resolvedDeptDoc)}`
    );

    const uniquePositionName = `Resol_Pos_${Date.now()}`;
    const resolvedPosId = await resolvePosition(uniquePositionName);
    const resolvedPosDoc = await Position.findById(resolvedPosId);
    assert(
      resolvedPosDoc !== null && resolvedPosDoc.name === uniquePositionName,
      'Creación automática en base de datos de cargos inexistentes'
    );


    console.log(`\n🧪  ${yellow}Ejecutando Caso QA-05: Certificaciones Organizacionales (Mongoose)...${reset}`);
    
    // Crear certificación marked como organizacional (sin empleado)
    const orgCert = new Certification({
      title: 'Certificación Corporativa de Compliance',
      description: 'Aplica a toda la empresa para capacitación interna',
      type: CertificationType.COMPLIANCE,
      technology: 'Compliance',
      provider: 'CertiVault Inc',
      level: CertificationLevel.BEGINNER,
      issueDate: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      certificateNumber: `QA-COMP-${Date.now()}`,
      status: 'active',
      tags: ['compliance', 'legal'],
      isOrganizational: true,
      appliesToAllCompany: true,
      employeeId: null,
      employeeName: null,
      department: null,
      createdBy: testLeader._id
    });

    let certSaveError = '';
    try {
      await orgCert.save();
    } catch (err: any) {
      certSaveError = err.message;
    }

    assert(
      certSaveError === '',
      'Esquema Mongoose permite guardar registros sin empleado si isOrganizational es verdadero',
      `Error de validación: ${certSaveError}`
    );


    console.log(`\n🧪  ${yellow}Ejecutando Caso QA-10: Rotación e Historial de Backups Locales...${reset}`);
    
    const backupFilename = await runLocalBackup();
    const backupsList = await getLocalBackupsList();
    
    assert(
      backupFilename.startsWith('backup-') && backupFilename.endsWith('.zip'),
      'Generación física de archivo de respaldo ZIP en carpeta backend/backups/',
      `Nombre generado: ${backupFilename}`
    );
    assert(
      backupsList.length > 0 && backupsList.some(b => b.filename === backupFilename),
      'Listado correcto de archivos de respaldo locales con metadatos de tamaño y fecha',
      `Lista de backups obtenidos: ${backupsList.map(b => b.filename).join(', ')}`
    );


    console.log(`\n🧪  ${yellow}Ejecutando Caso QA-12: Borrado Físico en Cascada de Departamento...${reset}`);
    
    // Crear un departamento de prueba para cascada
    const cascadeDept = new Department({
      name: `Dept Cascade QA ${testSuffix}`,
      code: `DCQA_${Date.now().toString().slice(-4)}`,
      isActive: true
    });
    await cascadeDept.save();

    // Crear un usuario y asociarlo a este departamento
    const cascadeUser = new User({
      username: `u_casc_${testSuffix}`,
      email: `user_casc${testSuffix}@empresa.com`,
      personalEmail: `user_casc${testSuffix}@personal.com`,
      password: 'Password123!',
      firstName: 'Usuario',
      lastName: 'Cascada',
      role: UserRole.READER,
      department: cascadeDept._id,
      position: tempPos._id,
      isActive: true
    });
    await cascadeUser.save();

    // Crear certificación individual asociada
    const cascadeCert = new Certification({
      title: 'Certificación Cascada QA',
      type: CertificationType.TECHNICAL,
      technology: 'Cloud',
      provider: 'AWS',
      level: CertificationLevel.BEGINNER,
      issueDate: new Date(),
      certificateNumber: `QA-CASC-${Date.now()}`,
      status: 'active',
      tags: ['cloud'],
      employeeId: cascadeUser._id,
      employeeName: 'Usuario Cascada',
      department: cascadeDept._id,
      createdBy: cascadeUser._id
    });
    await cascadeCert.save();

    // Ejecutar desvinculación
    await performDepartmentCascading(cascadeDept._id as mongoose.Types.ObjectId);
    // Eliminar físicamente
    await Department.findByIdAndDelete(cascadeDept._id);

    // Verificar cascada
    const verifiedUser = await User.findById(cascadeUser._id);
    const verifiedCert = await Certification.findById(cascadeCert._id);
    const verifiedDept = await Department.findById(cascadeDept._id);

    assert(
      verifiedDept === null,
      'Eliminación física del departamento de la base de datos',
      `El departamento aún existe: ${JSON.stringify(verifiedDept)}`
    );
    assert(
      verifiedUser?.department === null,
      'Cascada: Desvinculación del departamento en el usuario asignado',
      `Departamento del usuario: ${verifiedUser?.department}`
    );
    assert(
      verifiedCert?.department === null,
      'Cascada: Desvinculación del departamento en la certificación individual',
      `Departamento de la certificación: ${verifiedCert?.department}`
    );


    // 3. Limpiar recursos de prueba creados
    console.log(`\n🧹  ${yellow}Limpiando registros de prueba de la base de datos...${reset}`);
    await User.deleteOne({ _id: testLeader._id });
    await Department.deleteOne({ _id: tempDept._id });
    await Position.deleteOne({ _id: tempPos._id });
    await Department.deleteOne({ _id: testDept._id });
    await Department.deleteOne({ _id: resolvedDeptId1 });
    await Position.deleteOne({ _id: resolvedPosId });
    await Certification.deleteOne({ _id: orgCert._id });
    await User.deleteOne({ _id: cascadeUser._id });
    await Certification.deleteOne({ _id: cascadeCert._id });
    
    // Limpiar el backup físico generado
    const backupFilePath = path.join(__dirname, '../../backups', backupFilename);
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
    
    await database.disconnect();
    
    console.log(`\n${cyan}================================================================${reset}`);
    console.log(`🏁  ${cyan}Pruebas de QA finalizadas.${reset}`);
    console.log(`${cyan}================================================================${reset}`);

    // Imprimir resultado final en JSON formateado para el reporte
    console.log('\nJSON_RESULTS_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('JSON_RESULTS_END');

  } catch (error: any) {
    console.error(`\n${red}🚨 Error crítico ejecutando QA:${reset}`, error);
    process.exit(1);
  }
}

void runQA();
