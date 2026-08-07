import mongoose from 'mongoose';
import { logger } from './logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }
    DatabaseConnection.instance = this;
  }

  /**
   * Establece la conexión con MongoDB con un mecanismo de reintentos automático.
   * Esto previene que la aplicación backend aborte de forma inmediata si el motor
   * de base de datos tarda en iniciar o responder al arrancar el contenedor.
   * 
   * @param retries Número máximo de intentos de conexión permitidos.
   * @param delay Tiempo de espera en milisegundos entre cada intento.
   */
  public async connect(retries = 5, delay = 5000): Promise<void> {
    if (this.isConnected) {
      logger.info('📄 Ya está conectado a MongoDB');
      return;
    }

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI no esta definido en el entorno');
    }
    
    // Configuración estricta de consultas deshabilitada para mayor flexibilidad en los esquemas
    mongoose.set('strictQuery', false);
    
    const options = {
      serverSelectionTimeoutMS: 5000, // Tiempo límite de selección del servidor
      socketTimeoutMS: 45000 // Desconexión de socket inactivo tras 45s
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`🔌 Intentando conectar a MongoDB (Intento ${attempt}/${retries})...`);
        await mongoose.connect(mongoURI, options);
        
        this.isConnected = true;
        logger.info('🟢 Conectado exitosamente a MongoDB');
        logger.info(`📊 Base de datos: ${mongoose.connection.db?.databaseName || 'unknown'}`);
        logger.info(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
        return;
        
      } catch (error) {
        logger.error(`🔴 Intento ${attempt} fallido al conectar a MongoDB:`, error);
        
        if (attempt === retries) {
          logger.error('🚨 Se han agotado todos los intentos de conexión a la base de datos.');
          throw error;
        }
        
        logger.info(`⏳ Esperando ${delay / 1000} segundos antes de realizar el siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('📄 No hay conexión activa a MongoDB');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('🟡 Desconectado de MongoDB');
    } catch (error) {
      logger.error('🔴 Error desconectando de MongoDB:', error);
      throw error;
    }
  }

  public getStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionInfo(): object {
    if (!this.isConnected) {
      return { status: 'disconnected' };
    }

    return {
      status: 'connected',
      database: mongoose.connection.db?.databaseName || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState
    };
  }
}

// Eventos de conexión
mongoose.connection.on('connected', () => {
  logger.info('🟢 Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('🔴 Error de conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('🟡 Mongoose desconectado de MongoDB');
});

// Manejo de cierre de aplicación
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('🟡 Conexión de MongoDB cerrada por terminación de aplicación');
    process.exit(0);
  } catch (error) {
    logger.error('🔴 Error cerrando conexión de MongoDB:', error);
    process.exit(1);
  }
});

export const database = new DatabaseConnection();