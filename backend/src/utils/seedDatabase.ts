import mongoose from 'mongoose';
import { User, UserRole, Permission } from '../models/User';
import { Certification, CertificationStatus, CertificationType, CertificationLevel } from '../models/Certification';
import bcrypt from 'bcryptjs';
import { resolveDepartment, resolvePosition } from './resolveEntities';
import { logger } from '../config/logger';

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes (opcional - descomenta si quieres limpiar)
    // await Promise.all([
    //   User.deleteMany({}),
    //   Certification.deleteMany({})
    // ]);
    // console.log('🗑️ Datos existentes eliminados');

    // Verificar si ya hay datos
    const userCount = await User.countDocuments();
    const certCount = await Certification.countDocuments();
    
    if (userCount > 1 || certCount > 0) {
      console.log('📄 Base de datos ya contiene datos, omitiendo seed');
      console.log(`👥 Usuarios existentes: ${userCount}`);
      console.log(`📜 Certificaciones existentes: ${certCount}`);
      return;
    }

    // Crear usuarios de ejemplo
    const users = await createSampleUsers();
    console.log(`👥 ${users.length} usuarios creados`);

    // Crear certificaciones de ejemplo
    const certifications = await createSampleCertifications(users);
    console.log(`📜 ${certifications.length} certificaciones creadas`);

    console.log('✅ Seed de base de datos completado exitosamente');
  } catch (error) {
    logger.error('❌ Error en seed de base de datos:', error);
    throw error;
  }
};

const createSampleUsers = async () => {
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // Resolver IDs de departamentos dinámicamente
  const tiDeptId = await resolveDepartment('TI');
  const rrhhDeptId = await resolveDepartment('Recursos Humanos');
  const ingDeptId = await resolveDepartment('Ingeniería');
  const ventasDeptId = await resolveDepartment('Ventas');
  const mktDeptId = await resolveDepartment('Marketing');
  const finDeptId = await resolveDepartment('Finanzas');
  const opsDeptId = await resolveDepartment('Operaciones');

  // Resolver IDs de cargos dinámicamente
  const adminPosId = await resolvePosition('Administrador del Sistema');
  const techLeadPosId = await resolvePosition('Jefe de Tecnología');
  const hrDirPosId = await resolvePosition('Directora de Recursos Humanos');
  const srDevPosId = await resolvePosition('Desarrollador Senior');
  const qaEngPosId = await resolvePosition('Ingeniera de Calidad');
  const salesExecPosId = await resolvePosition('Ejecutivo de Ventas');
  const mktSpecPosId = await resolvePosition('Especialista en Marketing Digital');
  const finAnalystPosId = await resolvePosition('Analista Financiero');
  const hrAssistantPosId = await resolvePosition('Asistente de RRHH');
  const opsSupervisorPosId = await resolvePosition('Supervisor de Operaciones');

  const usersData = [
    // Administrador
    {
      username: 'admin',
      email: 'admin@empresa.com',
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 12),
      firstName: 'Administrador',
      lastName: 'del Sistema',
      role: UserRole.ADMIN,
      department: tiDeptId,
      position: adminPosId,
      isActive: true,
      permissions: Object.values(Permission)
    },
    
    // Líderes de departamento
    {
      username: 'jperez',
      email: 'jperez@empresa.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: UserRole.LIDER,
      department: tiDeptId,
      position: techLeadPosId,
      isActive: true,
      departmentLeader: true,
      managedDepartments: [tiDeptId],
      permissions: [
        Permission.READ_USERS,
        Permission.UPDATE_USERS,
        Permission.CREATE_USERS,
        Permission.MANAGE_OWN_DEPARTMENT,
        Permission.CREATE_CERTIFICATIONS,
        Permission.READ_CERTIFICATIONS,
        Permission.UPDATE_CERTIFICATIONS,
        Permission.DELETE_CERTIFICATIONS,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA
      ]
    },
    {
      username: 'mgarcia',
      email: 'mgarcia@empresa.com',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'García',
      role: UserRole.LIDER,
      department: rrhhDeptId,
      position: hrDirPosId,
      isActive: true,
      departmentLeader: true,
      managedDepartments: [rrhhDeptId],
      permissions: [
        Permission.READ_USERS,
        Permission.CREATE_USERS,
        Permission.UPDATE_USERS,
        Permission.MANAGE_OWN_DEPARTMENT,
        Permission.READ_CERTIFICATIONS,
        Permission.VIEW_REPORTS
      ]
    },

    // Técnicos especializados
    {
      username: 'lrodriguez',
      email: 'lrodriguez@empresa.com',
      password: hashedPassword,
      firstName: 'Luis',
      lastName: 'Rodríguez',
      role: UserRole.TECNICO,
      department: tiDeptId,
      position: srDevPosId,
      isActive: true,
      permissions: [
        Permission.CREATE_CERTIFICATIONS,
        Permission.READ_CERTIFICATIONS,
        Permission.UPDATE_CERTIFICATIONS
      ]
    },
    {
      username: 'asanchez',
      email: 'asanchez@empresa.com',
      password: hashedPassword,
      firstName: 'Ana',
      lastName: 'Sánchez',
      role: UserRole.TECNICO,
      department: ingDeptId,
      position: qaEngPosId,
      isActive: true,
      permissions: [
        Permission.CREATE_CERTIFICATIONS,
        Permission.READ_CERTIFICATIONS,
        Permission.UPDATE_CERTIFICATIONS
      ]
    },

    // Usuarios regulares
    {
      username: 'clopez',
      email: 'clopez@empresa.com',
      password: hashedPassword,
      firstName: 'Carlos',
      lastName: 'López',
      role: UserRole.READER,
      department: ventasDeptId,
      position: salesExecPosId,
      isActive: true,
      permissions: [Permission.READ_CERTIFICATIONS]
    },
    {
      username: 'pmartinez',
      email: 'pmartinez@empresa.com',
      password: hashedPassword,
      firstName: 'Patricia',
      lastName: 'Martínez',
      role: UserRole.READER,
      department: mktDeptId,
      position: mktSpecPosId,
      isActive: true,
      permissions: [Permission.READ_CERTIFICATIONS]
    },
    {
      username: 'rcastillo',
      email: 'rcastillo@empresa.com',
      password: hashedPassword,
      firstName: 'Roberto',
      lastName: 'Castillo',
      role: UserRole.READER,
      department: finDeptId,
      position: finAnalystPosId,
      isActive: true,
      permissions: [Permission.READ_CERTIFICATIONS]
    },

    // Readers (solo lectura)
    {
      username: 'eherrera',
      email: 'eherrera@empresa.com',
      password: hashedPassword,
      firstName: 'Elena',
      lastName: 'Herrera',
      role: UserRole.READER,
      department: rrhhDeptId,
      position: hrAssistantPosId,
      isActive: true,
      permissions: [Permission.READ_CERTIFICATIONS, Permission.READ_USERS]
    },
    {
      username: 'dgonzalez',
      email: 'dgonzalez@empresa.com',
      password: hashedPassword,
      firstName: 'Diego',
      lastName: 'González',
      role: UserRole.READER,
      department: opsDeptId,
      position: opsSupervisorPosId,
      isActive: true,
      permissions: [Permission.READ_CERTIFICATIONS, Permission.READ_USERS]
    }
  ];

  const usersWithPersonalEmail = usersData.map((user) => ({
    ...user,
    personalEmail: user.email.replace('@empresa.com', '@personal.com')
  }));

  for (const userData of usersWithPersonalEmail) {
    await User.updateOne(
      { username: userData.username },
      { $setOnInsert: userData },
      { upsert: true }
    );
  }

  const users = await Promise.all(
    usersWithPersonalEmail.map((userData) => User.findOne({ username: userData.username }))
  );
  const existingUsers = users.filter(Boolean);
  
  // Asignar createdBy para algunos usuarios (admin creó a los demás)
  if (existingUsers.length > 1) {
    const adminUser = existingUsers[0];
    if (adminUser && adminUser._id) {
      const adminId = adminUser._id;
      for (let i = 1; i < existingUsers.length; i++) {
        const user = existingUsers[i];
        if (user && !user.createdBy) {
          user.createdBy = adminId as any;
          await user.save();
        }
      }
    }
  }

  return existingUsers;
};

const createSampleCertifications = async (users: any[]) => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  const threeYearsFromNow = new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);

  const certificationsData = [
    // Certificaciones de TI
    {
      title: 'AWS Certified Solutions Architect - Associate',
      description: 'Certificación que valida la capacidad de diseñar sistemas distribuidos escalables y robustos en AWS.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Amazon Web Services',
      provider: 'Amazon Web Services',
      employeeId: users[3]._id, // Luis Rodríguez
      employeeName: `${users[3].firstName} ${users[3].lastName}`,
      department: users[3].department,
      issueDate: threeMonthsAgo,
      expirationDate: threeYearsFromNow,
      certificateNumber: 'AWS-SAA-2024-001',
      certificateUrl: 'https://aws.amazon.com/certification/',
      validationUrl: 'https://aws.amazon.com/verification/AWSSAA2024001',
      status: CertificationStatus.ACTIVE,
      score: 85,
      cost: 150,
      currency: 'USD',
      tags: ['cloud', 'architecture', 'aws', 'scalability'],
      notes: 'Certificación obtenida para proyecto de migración a la nube',
      createdBy: users[1]._id, // Juan Pérez (Líder TI)
      updatedBy: users[1]._id
    },
    {
      title: 'Microsoft Azure Administrator Associate',
      description: 'Certificación para administradores que gestionan servicios de computación, almacenamiento, red y seguridad en Azure.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Microsoft Azure',
      provider: 'Microsoft',
      employeeId: users[3]._id, // Luis Rodríguez
      employeeName: `${users[3].firstName} ${users[3].lastName}`,
      department: users[3].department,
      issueDate: sixMonthsAgo,
      expirationDate: twoYearsFromNow,
      certificateNumber: 'AZ-104-2024-002',
      certificateUrl: 'https://docs.microsoft.com/en-us/learn/certifications/',
      status: CertificationStatus.ACTIVE,
      score: 92,
      cost: 165,
      currency: 'USD',
      tags: ['azure', 'cloud', 'administration', 'microsoft'],
      notes: 'Certificación para administración de infraestructura Azure',
      createdBy: users[1]._id,
      updatedBy: users[1]._id
    },
    {
      title: 'Certified Kubernetes Administrator (CKA)',
      description: 'Certificación avanzada en administración de clusters Kubernetes y orquestación de contenedores.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.ADVANCED,
      technology: 'Kubernetes',
      provider: 'Cloud Native Computing Foundation',
      employeeId: users[1]._id, // Juan Pérez
      employeeName: `${users[1].firstName} ${users[1].lastName}`,
      department: users[1].department,
      issueDate: oneMonthAgo,
      expirationDate: threeYearsFromNow,
      certificateNumber: 'CKA-2024-003',
      certificateUrl: 'https://www.cncf.io/certification/cka/',
      status: CertificationStatus.ACTIVE,
      score: 88,
      cost: 300,
      currency: 'USD',
      tags: ['kubernetes', 'containers', 'orchestration', 'devops'],
      notes: 'Certificación avanzada en administración de Kubernetes',
      createdBy: users[0]._id, // Admin
      updatedBy: users[0]._id
    },

    // Certificaciones de Ingeniería/Calidad
    {
      title: 'ISO 9001:2015 Lead Auditor',
      description: 'Certificación para liderar auditorías de sistemas de gestión de calidad basados en ISO 9001:2015.',
      type: CertificationType.COMPLIANCE,
      level: CertificationLevel.EXPERT,
      technology: 'Quality Management',
      provider: 'International Organization for Standardization',
      employeeId: users[4]._id, // Ana Sánchez
      employeeName: `${users[4].firstName} ${users[4].lastName}`,
      department: users[4].department,
      issueDate: sixMonthsAgo,
      expirationDate: threeYearsFromNow,
      certificateNumber: 'ISO9001-LA-2024-004',
      certificateUrl: 'https://www.iso.org/certification',
      status: CertificationStatus.ACTIVE,
      score: 95,
      cost: 1200,
      currency: 'USD',
      tags: ['iso', 'quality', 'audit', 'compliance', 'standards'],
      notes: 'Certificación para auditoría de sistemas de gestión de calidad',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },
    {
      title: 'Six Sigma Green Belt',
      description: 'Metodología de mejora de procesos centrada en la eliminación de defectos y reducción de variabilidad.',
      type: CertificationType.MANAGEMENT,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Process Improvement',
      provider: 'International Association for Six Sigma Certification',
      employeeId: users[4]._id, // Ana Sánchez
      employeeName: `${users[4].firstName} ${users[4].lastName}`,
      department: users[4].department,
      issueDate: oneMonthAgo,
      expirationDate: oneYearFromNow,
      certificateNumber: 'SSGB-2024-005',
      certificateUrl: 'https://www.iassc.org/',
      status: CertificationStatus.ACTIVE,
      score: 87,
      cost: 800,
      currency: 'USD',
      tags: ['six-sigma', 'process-improvement', 'quality', 'lean'],
      notes: 'Metodología para mejora de procesos y reducción de defectos',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },

    // Certificaciones de Marketing
    {
      title: 'Google Ads Certified',
      description: 'Certificación oficial de Google para el manejo profesional de campañas publicitarias en Google Ads.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Digital Marketing',
      provider: 'Google',
      employeeId: users[6]._id, // Patricia Martínez
      employeeName: `${users[6].firstName} ${users[6].lastName}`,
      department: users[6].department,
      issueDate: threeMonthsAgo,
      expirationDate: oneYearFromNow,
      certificateNumber: 'GAD-2024-006',
      certificateUrl: 'https://skillshop.exceedlms.com/student/catalog',
      status: CertificationStatus.ACTIVE,
      score: 90,
      cost: 0, // Gratis
      currency: 'USD',
      tags: ['google-ads', 'digital-marketing', 'advertising', 'ppc'],
      notes: 'Certificación en gestión de campañas publicitarias en Google',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },
    {
      title: 'Facebook Social Media Marketing',
      description: 'Certificación en estrategias de marketing en redes sociales y gestión de campañas en Meta.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.BEGINNER,
      technology: 'Social Media',
      provider: 'Meta Blueprint',
      employeeId: users[6]._id, // Patricia Martínez
      employeeName: `${users[6].firstName} ${users[6].lastName}`,
      department: users[6].department,
      issueDate: oneMonthAgo,
      expirationDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 días (próxima a expirar)
      certificateNumber: 'META-SMM-2024-007',
      certificateUrl: 'https://www.facebook.com/business/learn',
      status: CertificationStatus.EXPIRING_SOON,
      score: 82,
      cost: 0,
      currency: 'USD',
      tags: ['facebook', 'social-media', 'marketing', 'meta'],
      notes: 'Certificación en marketing de redes sociales - próxima a expirar',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },

    // Certificaciones de Ventas
    {
      title: 'Salesforce Certified Administrator',
      description: 'Certificación para administrar y configurar la plataforma Salesforce CRM.',
      type: CertificationType.TECHNICAL,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Salesforce CRM',
      provider: 'Salesforce',
      employeeId: users[5]._id, // Carlos López
      employeeName: `${users[5].firstName} ${users[5].lastName}`,
      department: users[5].department,
      issueDate: threeMonthsAgo,
      expirationDate: oneYearFromNow,
      certificateNumber: 'SF-ADM-2024-008',
      certificateUrl: 'https://trailhead.salesforce.com/credentials',
      status: CertificationStatus.ACTIVE,
      score: 78,
      cost: 200,
      currency: 'USD',
      tags: ['salesforce', 'crm', 'administration', 'sales'],
      notes: 'Administración y configuración de la plataforma Salesforce',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },

    // Certificaciones de Finanzas
    {
      title: 'Certified Management Accountant (CMA)',
      description: 'Certificación profesional en contabilidad de gestión y análisis financiero estratégico.',
      type: CertificationType.COMPLIANCE,
      level: CertificationLevel.ADVANCED,
      technology: 'Financial Management',
      provider: 'Institute of Management Accountants',
      employeeId: users[7]._id, // Roberto Castillo
      employeeName: `${users[7].firstName} ${users[7].lastName}`,
      department: users[7].department,
      issueDate: sixMonthsAgo,
      expirationDate: threeYearsFromNow,
      certificateNumber: 'CMA-2024-009',
      certificateUrl: 'https://www.imanet.org/cma-certification',
      status: CertificationStatus.ACTIVE,
      score: 91,
      cost: 415,
      currency: 'USD',
      tags: ['accounting', 'finance', 'management', 'strategy'],
      notes: 'Certificación en contabilidad de gestión y análisis financiero',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    },

    // Certificación expirada para demostrar funcionalidad
    {
      title: 'CompTIA Security+',
      description: 'Certificación fundamental en ciberseguridad que cubre principios de seguridad IT.',
      type: CertificationType.SECURITY,
      level: CertificationLevel.INTERMEDIATE,
      technology: 'Cybersecurity',
      provider: 'CompTIA',
      employeeId: users[3]._id, // Luis Rodríguez
      employeeName: `${users[3].firstName} ${users[3].lastName}`,
      department: users[3].department,
      issueDate: new Date('2021-01-15'),
      expirationDate: new Date('2024-01-15'), // Expirada
      certificateNumber: 'SEC-PLUS-2021-010',
      certificateUrl: 'https://www.comptia.org/certifications/security',
      status: CertificationStatus.EXPIRED,
      score: 83,
      cost: 320,
      currency: 'USD',
      tags: ['security', 'cybersecurity', 'comptia', 'expired'],
      notes: 'Certificación expirada - requiere renovación urgente',
      createdBy: users[1]._id,
      updatedBy: users[1]._id
    },

    // Certificación en proceso
    {
      title: 'Project Management Professional (PMP)',
      description: 'Certificación líder mundial en gestión de proyectos, reconocida internacionalmente.',
      type: CertificationType.MANAGEMENT,
      level: CertificationLevel.ADVANCED,
      technology: 'Project Management',
      provider: 'Project Management Institute',
      employeeId: users[2]._id, // María García
      employeeName: `${users[2].firstName} ${users[2].lastName}`,
      department: users[2].department,
      issueDate: now,
      expirationDate: threeYearsFromNow,
      certificateNumber: 'PMP-2024-011',
      certificateUrl: 'https://www.pmi.org/certifications',
      status: CertificationStatus.PENDING,
      score: null,
      cost: 555,
      currency: 'USD',
      tags: ['project-management', 'pmi', 'leadership', 'pending'],
      notes: 'Certificación en proceso de validación por PMI',
      createdBy: users[0]._id,
      updatedBy: users[0]._id
    }
  ];

  return await Certification.insertMany(certificationsData);
};
