import mongoose, { Document, Schema } from 'mongoose';

// Interfaz para definir la estructura de un Departamento en TypeScript
export interface IDepartment extends Document {
  name: string;
  code: string;
  leaderId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para el modelo Departamento
const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del departamento es requerido'],
      unique: true,
      trim: true,
      maxlength: [100, 'El nombre del departamento no puede tener más de 100 caracteres']
    },
    code: {
      type: String,
      required: [true, 'El código del departamento es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'El código del departamento no puede tener más de 20 caracteres']
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
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

// Índices para optimizar búsquedas por código de departamento, estado de actividad y líder asignado
departmentSchema.index({ code: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ leaderId: 1 });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
