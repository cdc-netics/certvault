import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
// import rateLimit from 'express-rate-limit';

// Importar configuracion de base de datos y seed
import { database } from './config/database';
import { seedDatabase } from './utils/seedDatabase';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import certificationRoutes from './routes/certifications';
import dashboardRoutes from './routes/dashboard';

// Importar middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Cargar variables de entorno sin depender del directorio desde el que se ejecute
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Configuracion de CORS con multiples orígenes permitidos
const normalizeOrigin = (value: string) => value.replace(/\/$/, '');
const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => normalizeOrigin(o.trim())) : []),
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.0.101.27',
  'http://10.0.101.27:4200'
].filter(Boolean);
const allowAllOrigins = false; // En productivo solo se permiten los orígenes explícitos

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
app.use(morgan('combined'));

// Rate limiting reforzado
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo mas tarde.'
    });
  }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estaticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
    const adminExists = await User.findOne({ role: UserRole.ADMIN });

    if (!adminExists) {
      console.log('Creando usuario administrador por defecto...');
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@empresa.com',
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
      console.log('Usuario administrador ya existe');
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
    console.log(`Health: http://localhost:${PORT}/api/health`);
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
