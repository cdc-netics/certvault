import mongoose from 'mongoose';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }
    DatabaseConnection.instance = this;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📄 Ya está conectado a MongoDB');
      return;
    }

    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://10.0.101.27:27017/certif-app';
      
      // Configuración de mongoose
      mongoose.set('strictQuery', false);
      
      // Opciones de conexión
      const options = {
        serverSelectionTimeoutMS: 5000, // Timeout después de 5s en lugar de 30s por defecto
        socketTimeoutMS: 45000 // Cerrar socket después de 45s de inactividad
      };

      // Conectar a MongoDB
      await mongoose.connect(mongoURI, options);
      
      this.isConnected = true;
      console.log('🟢 Conectado exitosamente a MongoDB');
      console.log(`📊 Base de datos: ${mongoose.connection.db?.databaseName || 'unknown'}`);
      console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
    } catch (error) {
      console.error('🔴 Error conectando a MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('📄 No hay conexión activa a MongoDB');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🟡 Desconectado de MongoDB');
    } catch (error) {
      console.error('🔴 Error desconectando de MongoDB:', error);
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
  console.log('🟢 Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Error de conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose desconectado de MongoDB');
});

// Manejo de cierre de aplicación
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🟡 Conexión de MongoDB cerrada por terminación de aplicación');
    process.exit(0);
  } catch (error) {
    console.error('🔴 Error cerrando conexión de MongoDB:', error);
    process.exit(1);
  }
});

export const database = new DatabaseConnection();