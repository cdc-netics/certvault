import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

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

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(morgan('combined'));

// Rate limiting (aplicar después de CORS para que incluya cabeceras en 429)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo mas tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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
    console.log('?? Inicializando conexión a MongoDB...');
    await database.connect();
    console.log('? Conexión a MongoDB establecida exitosamente');
    await createDefaultAdminAndSeed();
  } catch (error) {
    console.error('? Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Crear usuario administrador por defecto y datos de ejemplo
const createDefaultAdminAndSeed = async (): Promise<void> => {
  try {
    const { User, UserRole, Department, Permission } = await import('./models/User');
    const adminExists = await User.findOne({ role: UserRole.ADMIN });
    if (!adminExists) {
      console.log('?? Creando usuario administrador por defecto...');
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
      console.log('? Usuario administrador creado exitosamente');
      console.log(`??  Email: ${adminUser.email}`);
      console.log(`??  Contraseña: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
      console.log('?? Primera instalación detectada, creando datos de ejemplo...');
      await seedDatabase();
    } else {
      console.log('?? Usuario administrador ya existe');
      const userCount = await User.countDocuments();
      if (userCount === 1) {
        console.log('?? Ejecutando seed de datos de ejemplo...');
        await seedDatabase();
      } else {
        console.log('?? Base de datos ya contiene datos');
      }
    }
  } catch (error) {
    console.error('? Error en configuración inicial:', error);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('?? Recibida señal SIGTERM, cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('?? Recibida señal SIGINT, cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

// Iniciar servidor
const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`?? Servidor corriendo en puerto ${PORT}`);
    console.log(`?? Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`?? Health: http://localhost:${PORT}/api/health`);
  });
};

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('? Variables de entorno faltantes:', missingEnvVars.join(', '));
  process.exit(1);
}

startServer().catch(error => {
  console.error('? Error iniciando servidor:', error);
  process.exit(1);
});

export default app;
