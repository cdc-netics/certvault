import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { getPositions, createPosition, updatePosition, deletePosition } from '../controllers/positionsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', getPositions);
router.post('/', adminOnly, createPosition);
router.put('/:id', adminOnly, updatePosition);
router.delete('/:id', adminOnly, deletePosition);

export default router;
