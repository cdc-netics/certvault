import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas del dashboard requieren autenticación
router.use(authenticate);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Dashboard data - En desarrollo',
      stats: {
        totalCertifications: 0,
        activeCertifications: 0,
        expiredCertifications: 0,
        expiringSoon: 0
      }
    }
  });
});

export default router;