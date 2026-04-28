import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
let lastAvatarUrl: string | null = null;
let demoBranding = {
  appName: 'CertiVault',
  companyName: 'Netics',
  primaryColor: '#0d6efd',
  secondaryColor: '#6c757d',
  sidebarLogo: '',
  loginLogo: '',
  reportLogo: '',
  reportFooter: 'Reporte generado por CertiVault'
};
let demoSmtpProfiles: any[] = [];
const demoAuditLogs = [
  {
    _id: 'audit-1',
    action: 'login_success',
    resource: 'auth',
    userEmail: 'admin@empresa.com',
    method: 'POST',
    path: '/api/auth/login',
    statusCode: 200,
    ip: '127.0.0.1',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'audit-2',
    action: 'export',
    resource: 'backup',
    userEmail: 'admin@empresa.com',
    method: 'GET',
    path: '/api/settings/backup/export',
    statusCode: 200,
    ip: '127.0.0.1',
    createdAt: new Date().toISOString()
  }
];

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/api/health' || req.path.startsWith('/uploads')
}));
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Helper para guardar avatar base64 en disco (demo sin BD)
const saveAvatarToDisk = (base64: string): string | null => {
  try {
    const matches = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3 || !matches[1] || !matches[2]) return null;

    const mime = matches[1];
    const ext = mime?.split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `avatar-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/avatars/${filename}`;
  } catch (err) {
    console.error('Error guardando avatar en demo:', err);
    return null;
  }
};

// Rutas de demostración
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Credenciales de demo
  if (email === 'admin@empresa.com' && password === 'Admin123!') {
    res.json({
      success: true,
      data: {
        token: 'demo-jwt-token-12345',
        user: {
          _id: '1',
          username: 'admin',
          email: 'admin@empresa.com',
          firstName: 'Administrador',
          lastName: 'del Sistema',
          role: 'admin',
          department: 'TI',
          position: 'Administrador del Sistema',
          isActive: true,
          avatarUrl: lastAvatarUrl
        },
        expiresIn: 7 * 24 * 60 * 60
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: '2',
      username: req.body.username,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      department: req.body.department,
      position: req.body.position,
      role: 'user',
      isActive: true,
      avatarUrl: null
    },
    message: 'Usuario registrado exitosamente'
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: '1',
      username: 'admin',
      email: 'admin@empresa.com',
      firstName: 'Administrador',
      lastName: 'del Sistema',
      role: 'admin',
      department: 'TI',
      position: 'Administrador del Sistema',
      isActive: true,
      avatarUrl: lastAvatarUrl
    }
  });
});

app.put('/api/auth/profile', (req, res) => {
  let savedAvatarUrl: string | null = null;

  if (req.body.avatar && typeof req.body.avatar === 'string' && req.body.avatar.startsWith('data:image')) {
    savedAvatarUrl = saveAvatarToDisk(req.body.avatar);
    if (savedAvatarUrl) {
      lastAvatarUrl = savedAvatarUrl;
    }
  } else if (req.body.avatarUrl) {
    lastAvatarUrl = req.body.avatarUrl;
  }

  res.json({
    success: true,
    data: {
      _id: '1',
      username: 'admin',
      email: req.body.email || 'admin@empresa.com',
      firstName: req.body.firstName || 'Administrador',
      lastName: req.body.lastName || 'del Sistema',
      role: 'admin',
      department: 'TI',
      position: req.body.position || 'Administrador del Sistema',
      phone: req.body.phone,
      avatarUrl: lastAvatarUrl,
      isActive: true
    },
    message: 'Perfil actualizado exitosamente'
  });
});

app.put('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (currentPassword === 'Admin123!') {
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente (demo)'
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'La contraseña actual es incorrecta'
    });
  }
});

app.get('/api/certifications', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Lista de certificaciones (demo sin BD)'
  });
});

app.get('/api/users', (req, res) => {
  const demoUsers = [
    {
      _id: '1',
      username: 'admin',
      email: 'admin@empresa.com',
      firstName: 'Administrador',
      lastName: 'del Sistema',
      role: 'admin',
      department: 'TI',
      position: 'Administrador del Sistema',
      isActive: true,
      departmentLeader: false,
      managedDepartments: [],
      permissions: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      avatarUrl: lastAvatarUrl
    },
    {
      _id: '2',
      username: 'jperez',
      email: 'jperez@empresa.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'lider',
      department: 'RRHH',
      position: 'Líder de Recursos Humanos',
      isActive: true,
      departmentLeader: true,
      managedDepartments: ['RRHH'],
      permissions: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      avatarUrl: null
    },
    {
      _id: '3',
      username: 'mgarcia',
      email: 'mgarcia@empresa.com',
      firstName: 'María',
      lastName: 'García',
      role: 'tecnico',
      department: 'TI',
      position: 'Técnico de Sistemas',
      isActive: true,
      departmentLeader: false,
      managedDepartments: [],
      permissions: [],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      avatarUrl: null
    },
    {
      _id: '4',
      username: 'lrodriguez',
      email: 'lrodriguez@empresa.com',
      firstName: 'Luis',
      lastName: 'Rodríguez',
      role: 'reader',
      department: 'Finanzas',
      position: 'Analista de Informes',
      isActive: true,
      departmentLeader: false,
      managedDepartments: [],
      permissions: [],
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-02-15'),
      avatarUrl: null
    },
    {
      _id: '5',
      username: 'asanchez',
      email: 'asanchez@empresa.com',
      firstName: 'Ana',
      lastName: 'Sánchez',
      role: 'user',
      department: 'Ventas',
      position: 'Ejecutiva de Ventas',
      isActive: true,
      departmentLeader: false,
      managedDepartments: [],
      permissions: [],
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01'),
      avatarUrl: null
    }
  ];

  res.json({
    success: true,
    data: {
      users: demoUsers,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalUsers: demoUsers.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    },
    message: 'Lista de usuarios (demo sin BD)'
  });
});

app.get('/api/users/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 5,
      active: 5,
      inactive: 0,
      departmentLeaders: 1,
      byRole: {
        admin: 1,
        lider: 1,
        tecnico: 1,
        reader: 1,
        user: 1
      },
      byDepartment: {
        TI: 2,
        RRHH: 1,
        Finanzas: 1,
        Ventas: 1
      }
    }
  });
});

app.get('/api/users/departments', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'TI', value: 'TI', label: 'TI' },
      { key: 'RRHH', value: 'RRHH', label: 'RRHH' },
      { key: 'FINANZAS', value: 'Finanzas', label: 'Finanzas' },
      { key: 'OPERACIONES', value: 'Operaciones', label: 'Operaciones' },
      { key: 'VENTAS', value: 'Ventas', label: 'Ventas' },
      { key: 'MARKETING', value: 'Marketing', label: 'Marketing' },
      { key: 'INGENIERIA', value: 'Ingeniería', label: 'Ingeniería' },
      { key: 'CALIDAD', value: 'Calidad', label: 'Calidad' },
      { key: 'SEGURIDAD', value: 'Seguridad', label: 'Seguridad' },
      { key: 'LEGAL', value: 'Legal', label: 'Legal' }
    ]
  });
});

app.get('/api/users/roles', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'ADMIN', value: 'admin', label: 'admin' },
      { key: 'LIDER', value: 'lider', label: 'lider' },
      { key: 'TECNICO', value: 'tecnico', label: 'tecnico' },
      { key: 'READER', value: 'reader', label: 'reader' },
      { key: 'USER', value: 'user', label: 'user' }
    ]
  });
});

app.post('/api/users', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: '6',
      username: req.body.username,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: req.body.role || 'user',
      department: req.body.department,
      position: req.body.position,
      isActive: true,
      departmentLeader: req.body.departmentLeader || false,
      managedDepartments: req.body.managedDepartments || [],
      permissions: req.body.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      avatarUrl: null
    },
    message: 'Usuario creado exitosamente (demo)'
  });
});

app.get('/api/users/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.params.id,
      username: 'usuario-demo',
      email: 'demo@empresa.com',
      firstName: 'Usuario',
      lastName: 'Demo',
      role: 'user',
      department: 'TI',
      position: 'Empleado',
      isActive: true,
      departmentLeader: false,
      managedDepartments: [],
      permissions: [],
      avatarUrl: null
    }
  });
});

app.put('/api/users/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.params.id,
      ...req.body,
      updatedAt: new Date()
    },
    message: 'Usuario actualizado exitosamente (demo)'
  });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Usuario eliminado exitosamente (demo)'
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        total: 24,
        active: 18,
        expired: 3,
        expiringSoon: 3
      },
      recentCertifications: [],
      expiringSoon: []
    }
  });
});

app.get('/api/settings/smtp-profiles', (req, res) => {
  res.json({ success: true, data: demoSmtpProfiles });
});

app.post('/api/settings/smtp-profiles', (req, res) => {
  const profile = {
    id: `${Date.now()}`,
    ...req.body,
    hasPassword: Boolean(req.body.password),
    isActive: Boolean(req.body.isActive),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (profile.isActive) {
    demoSmtpProfiles = demoSmtpProfiles.map(item => ({ ...item, isActive: false }));
  }
  demoSmtpProfiles.push(profile);
  res.status(201).json({ success: true, data: profile, message: 'Perfil SMTP creado exitosamente (demo)' });
});

app.put('/api/settings/smtp-profiles/:id', (req, res) => {
  const index = demoSmtpProfiles.findIndex(profile => profile.id === req.params.id);
  if (index < 0) {
    res.status(404).json({ success: false, error: 'Perfil SMTP no encontrado' });
    return;
  }
  if (req.body.isActive) {
    demoSmtpProfiles = demoSmtpProfiles.map(item => ({ ...item, isActive: false }));
  }
  demoSmtpProfiles[index] = {
    ...demoSmtpProfiles[index],
    ...req.body,
    hasPassword: demoSmtpProfiles[index].hasPassword || Boolean(req.body.password),
    updatedAt: new Date().toISOString()
  };
  res.json({ success: true, data: demoSmtpProfiles[index], message: 'Perfil SMTP actualizado exitosamente (demo)' });
});

app.delete('/api/settings/smtp-profiles/:id', (req, res) => {
  demoSmtpProfiles = demoSmtpProfiles.filter(profile => profile.id !== req.params.id);
  res.json({ success: true, message: 'Perfil SMTP eliminado exitosamente (demo)' });
});

app.post('/api/settings/smtp-profiles/:id/activate', (req, res) => {
  let selectedProfile: any | undefined;
  demoSmtpProfiles = demoSmtpProfiles.map(profile => {
    const isActive = profile.id === req.params.id;
    const updated = { ...profile, isActive };
    if (isActive) selectedProfile = updated;
    return updated;
  });
  if (!selectedProfile) {
    res.status(404).json({ success: false, error: 'Perfil SMTP no encontrado' });
    return;
  }
  res.json({ success: true, data: selectedProfile, message: 'Perfil SMTP activado exitosamente (demo)' });
});

app.post('/api/settings/smtp-profiles/:id/deactivate', (req, res) => {
  const profile = demoSmtpProfiles.find(item => item.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Perfil SMTP no encontrado' });
    return;
  }
  profile.isActive = false;
  res.json({ success: true, data: profile, message: 'Perfil SMTP desactivado exitosamente (demo)' });
});

app.post('/api/settings/smtp-profiles/:id/test', (req, res) => {
  const profile = demoSmtpProfiles.find(item => item.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Perfil SMTP no encontrado' });
    return;
  }
  profile.lastTestAt = new Date().toISOString();
  profile.lastTestSuccess = true;
  profile.lastTestMessage = req.body.to
    ? `Conexion simulada y correo demo enviado a ${req.body.to}`
    : 'Conexion simulada correctamente';
  res.json({ success: true, data: profile, message: profile.lastTestMessage });
});

app.get('/api/settings/audit-logs', (req, res) => {
  res.json({
    success: true,
    data: {
      logs: demoAuditLogs,
      pagination: {
        currentPage: Number(req.query.page) || 1,
        totalPages: 1,
        totalItems: demoAuditLogs.length
      }
    }
  });
});

app.get('/api/settings/backup/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      users: 5,
      certifications: 0,
      smtpProfiles: demoSmtpProfiles.length,
      auditLogs: demoAuditLogs.length
    }
  });
});

app.get('/api/settings/backup/export', (req, res) => {
  const backup = {
    exportedAt: new Date().toISOString(),
    mode: 'demo',
    collections: {
      users: 5,
      certifications: [],
      smtpProfiles: demoSmtpProfiles,
      branding: demoBranding
    }
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="certivault-demo-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.get('/api/settings/branding', (req, res) => {
  res.json({ success: true, data: demoBranding });
});

app.put('/api/settings/branding', (req, res) => {
  demoBranding = { ...demoBranding, ...req.body };
  res.json({ success: true, data: demoBranding, message: 'Branding actualizado exitosamente (demo)' });
});

app.get('/api/settings/reports/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      totals: {
        totalCertifications: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0,
        totalUsers: 5,
        activeUsers: 5
      },
      byDepartment: [
        { _id: 'TI', count: 2 },
        { _id: 'RRHH', count: 1 },
        { _id: 'Finanzas', count: 1 },
        { _id: 'Ventas', count: 1 }
      ],
      byStatus: [],
      byProvider: [],
      byTechnology: []
    }
  });
});

app.get('/api/settings/reports/export', (req, res) => {
  const csv = '"Titulo","Empleado","Departamento","Proveedor","Tecnologia","Estado","Emision","Expiracion"\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="certivault-demo-reporte-${Date.now()}.csv"`);
  res.send(csv);
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente (MODO DEMO - SIN BASE DE DATOS)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de manejo de errores
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada - ${req.originalUrl}`
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor DEMO corriendo en puerto ${PORT}`);
  console.log(`🌱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
  console.log(`ℹ️  MODO DEMO: Sin base de datos MongoDB`);
  console.log(`🔐 Login demo: admin@empresa.com / Admin123!`);
});

export default app;
