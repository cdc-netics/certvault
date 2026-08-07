import mongoose from 'mongoose';
import { Department } from '../models/Department';
import { Position } from '../models/Position';

/**
 * Genera un código único e inmutable para un nuevo departamento a partir de su nombre.
 * @param name Nombre del departamento
 */
const generateDepartmentCode = async (name: string): Promise<string> => {
  const baseCode = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Eliminar caracteres especiales y espacios
    .substring(0, 4);

  let code = baseCode || 'DEPT';
  let counter = 1;
  
  // Si el código ya existe, añadir un sufijo numérico incremental para evitar colisiones
  while (await Department.findOne({ code })) {
    code = `${baseCode}${counter}`;
    counter++;
  }
  return code;
};

/**
 * Resuelve un departamento a partir de un ID o de un nombre.
 * Si se pasa un ObjectId de un departamento existente, se retorna.
 * Si se pasa un string que representa un departamento nuevo (o no registrado), se crea.
 * @param deptInput ID o nombre del departamento
 */
export const resolveDepartment = async (deptInput: string): Promise<mongoose.Types.ObjectId> => {
  if (!deptInput || !deptInput.trim()) {
    throw new Error('El departamento especificado está vacío o no es válido');
  }

  const trimmed = deptInput.trim();

  // 1. Intentar validar si es un ObjectId de Mongoose válido
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const dept = await Department.findById(trimmed);
    if (dept) {
      return dept._id as mongoose.Types.ObjectId;
    }
  }

  // 2. Buscar por nombre exacto (case-insensitive)
  const existingDept = await Department.findOne({
    name: { $regex: new RegExp(`^${trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
  });

  if (existingDept) {
    return existingDept._id as mongoose.Types.ObjectId;
  }

  // 3. Crear el departamento dinámicamente si no existe (creación al vuelo)
  const code = await generateDepartmentCode(trimmed);
  const newDept = await Department.create({
    name: trimmed,
    code,
    isActive: true
  });

  return newDept._id as mongoose.Types.ObjectId;
};

/**
 * Resuelve una posición o cargo a partir de un ID o de un nombre.
 * Si se pasa un ObjectId de un cargo existente, se retorna.
 * Si se pasa un string que representa un cargo nuevo, se crea dinámicamente.
 * @param posInput ID o nombre de la posición
 */
export const resolvePosition = async (posInput: string): Promise<mongoose.Types.ObjectId> => {
  if (!posInput || !posInput.trim()) {
    throw new Error('El cargo especificado está vacío o no es válido');
  }

  const trimmed = posInput.trim();

  // 1. Intentar validar si es un ObjectId de Mongoose válido
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const pos = await Position.findById(trimmed);
    if (pos) {
      return pos._id as mongoose.Types.ObjectId;
    }
  }

  // 2. Buscar por nombre exacto (case-insensitive)
  const existingPos = await Position.findOne({
    name: { $regex: new RegExp(`^${trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
  });

  if (existingPos) {
    return existingPos._id as mongoose.Types.ObjectId;
  }

  // 3. Crear el cargo dinámicamente si no existe (creación al vuelo)
  const newPos = await Position.create({
    name: trimmed,
    isActive: true
  });

  return newPos._id as mongoose.Types.ObjectId;
};
