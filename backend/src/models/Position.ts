import mongoose, { Document, Schema } from 'mongoose';

// Interfaz para definir la estructura de un Cargo/Posición en TypeScript
export interface IPosition extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para el modelo Position (Cargos/Puestos de trabajo)
const positionSchema = new Schema<IPosition>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del cargo es requerido'],
      unique: true,
      trim: true,
      maxlength: [100, 'El nombre del cargo no puede tener más de 100 caracteres']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Índice para agilizar las búsquedas de cargos activos e inactivos en el sistema
positionSchema.index({ isActive: 1 });

export const Position = mongoose.model<IPosition>('Position', positionSchema);
