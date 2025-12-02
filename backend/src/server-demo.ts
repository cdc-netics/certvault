import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
          isActive: true
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
      isActive: true
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
      isActive: true
    }
  });
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
      updatedAt: new Date('2024-01-01')
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
      updatedAt: new Date('2024-01-15')
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
      updatedAt: new Date('2024-02-01')
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
      updatedAt: new Date('2024-02-15')
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
      updatedAt: new Date('2024-03-01')
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
      updatedAt: new Date()
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
      permissions: []
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

app.put('/api/auth/profile', (req, res) => {
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor DEMO corriendo en puerto ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚠️  MODO DEMO: Sin base de datos MongoDB`);
  console.log(`🔑 Login demo: admin@empresa.com / Admin123!`);
});

export default app;