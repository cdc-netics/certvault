import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPositions, createPosition } from '../controllers/positionsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', getPositions);
router.post('/', createPosition);

export default router;
