import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Listar y ver detalles (accesible por cualquier usuario autenticado)
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);

// Acciones de administración de departamentos (solo accesible por administradores)
router.post('/', adminOnly, createDepartment);
router.put('/:id', adminOnly, updateDepartment);
router.delete('/:id', adminOnly, deleteDepartment);

export default router;
