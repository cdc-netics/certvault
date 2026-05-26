import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// import rateLimit from 'express-rate-limit';

// Importar configuracion de base de datos y seed
import { database } from './config/database';
import { seedDatabase } from './utils/seedDatabase';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import certificationRoutes from './routes/certifications';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';

// Importar middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { auditRequest } from './services/auditService';

// Cargar variables de entorno desde la raiz del repositorio.
const explicitEnvPath = process.env.ENV_FILE;
const envCandidates = [
  explicitEnvPath,
  path.resolve(__dirname, '../../.env')
].filter((candidate): candidate is string => Boolean(candidate));

const discoveredEnvPath = envCandidates.find(candidate => fs.existsSync(candidate));
if (discoveredEnvPath) {
  dotenv.config({ path: discoveredEnvPath });
}

// Expandir variables de entorno de forma iterativa para soportar interpolación compleja (ej. ${PORT})
// Se realizan múltiples pasadas (máximo 3) para garantizar que las dependencias anidadas se resuelvan correctamente.
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


const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || process.env.FRONTEND_URL || '';

// Configuracion de CORS con multiples orígenes permitidos
const normalizeOrigin = (value: string) => value.replace(/\/$/, '');
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => normalizeOrigin(o.trim())) : []),
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => normalizeOrigin(o.trim())) : [])
].filter(Boolean);
const allowAllOrigins = (process.env.CORS_ALLOW_ALL_ORIGINS || 'false').toLowerCase() === 'true';

// Middlewares
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (allowAllOrigins) return callback(null, true);
    if (!origin) return callback(null, true); // Permitir requests sin origen (Postman, curl)
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  maxAge: 600, // cachear preflight 10 minutos
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Responder preflights en Express 5 usando regex en lugar de comodín
app.options(/^\/.*$/, cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/api/health' || req.path.startsWith('/uploads')
}));


// Rate limiting DESACTIVADO para desarrollo
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (_req, res) => {
//     res.status(429).json({
//       success: false,
//       error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo mas tarde.'
//     });
//   }
// });
// app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(auditRequest);

// Servir solo avatares publicos. Los certificados se entregan por endpoint autenticado.
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Ruta de salud con informacion de base de datos
app.get('/api/health', (req, res) => {
  const dbInfo = database.getConnectionInfo();
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbInfo
  });
});

// Middleware de manejo de errores
app.use(notFound);
app.use(errorHandler);

// Conectar a MongoDB y configurar base de datos
const connectDB = async (): Promise<void> => {
  try {
    console.log('Inicializando conexion a MongoDB...');
    await database.connect();
    console.log('Conexion a MongoDB establecida exitosamente');
    await createDefaultAdminAndSeed();
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Crear usuario administrador por defecto y datos de ejemplo
const createDefaultAdminAndSeed = async (): Promise<void> => {
  try {
    const { User, UserRole, Department, Permission } = await import('./models/User');

    const backfillPersonalEmailResult = await User.updateMany(
      {
        $or: [
          { personalEmail: { $exists: false } },
          { personalEmail: null },
          { personalEmail: '' }
        ]
      },
      [
        {
          $set: {
            personalEmail: '$email'
          }
        }
      ]
    );

    const backfillIsActiveResult = await User.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    if (backfillPersonalEmailResult.modifiedCount > 0 || backfillIsActiveResult.modifiedCount > 0) {
      console.log(
        `Backfill usuarios aplicado: personalEmail=${backfillPersonalEmailResult.modifiedCount}, isActive=${backfillIsActiveResult.modifiedCount}`
      );
    }

    const adminExists = await User.findOne({ role: UserRole.ADMIN }).select('+password');

    if (!adminExists) {
      console.log('Creando usuario administrador por defecto...');
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@empresa.com',
        personalEmail: process.env.ADMIN_PERSONAL_EMAIL || process.env.ADMIN_EMAIL || 'admin@empresa.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123!',
        firstName: 'Administrador',
        lastName: 'del Sistema',
        role: UserRole.ADMIN,
        department: Department.TI,
        position: 'Administrador del Sistema',
        isActive: true,
        permissions: Object.values(Permission)
      });
      await adminUser.save();
      console.log('Usuario administrador creado exitosamente');
      console.log(`Email: ${adminUser.email}`);
      console.log(`Contrasena: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
      console.log('Primera instalacion detectada, creando datos de ejemplo...');
      await seedDatabase();
    } else {
      console.log('Usuario administrador ya existe. Sincronizando contraseña con el .env actual...');
      const envPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      adminExists.password = envPassword;
      await adminExists.save();
      console.log('Contraseña del administrador sincronizada con éxito');

      const userCount = await User.countDocuments();
      if (userCount === 1) {
        console.log('Ejecutando seed de datos de ejemplo...');
        await seedDatabase();
      } else {
        console.log('Base de datos ya contiene datos');
      }
    }
  } catch (error) {
    console.error('Error en configuracion inicial:', error);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('Recibida senal SIGTERM, cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recibida senal SIGINT, cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

// Iniciar servidor
const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (PUBLIC_API_BASE_URL) {
      console.log(`Health: ${PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/health`);
    } else {
      console.log(`Health endpoint: /api/health`);
    }
  });
};

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Variables de entorno faltantes:', missingEnvVars.join(', '));
  process.exit(1);
}

startServer().catch(error => {
  console.error('Error iniciando servidor:', error);
  process.exit(1);
});

export default app;
