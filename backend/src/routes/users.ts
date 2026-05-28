import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getDepartments,
  getRoles,
  forcePasswordChange
} from '../controllers/usersController';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticate);

// Rutas de información básica
router.get('/departments', getDepartments);
router.get('/roles', getRoles);
router.get('/stats', getUserStats);

// CRUD de usuarios
router.get('/', getUsers);
router.post('/', createUser);
router.post('/force-password-change', forcePasswordChange);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;