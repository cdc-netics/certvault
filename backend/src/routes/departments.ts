import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  bulkDeleteDepartments,
  bulkInactivateDepartments
} from '../controllers/departmentsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Listar (accesible por cualquier usuario autenticado)
router.get('/', getDepartments);

// Acciones de administración en lote (solo accesible por administradores)
router.post('/bulk-delete', adminOnly, bulkDeleteDepartments);
router.post('/bulk-inactivate', adminOnly, bulkInactivateDepartments);

// Ver detalles
router.get('/:id', getDepartmentById);

// Acciones individuales
router.post('/', adminOnly, createDepartment);
router.put('/:id', adminOnly, updateDepartment);
router.delete('/:id', adminOnly, deleteDepartment);

export default router;
