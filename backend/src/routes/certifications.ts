import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import {
  createCertification,
  getCertifications,
  getCertificationById,
  updateCertification,
  deleteCertification,
  getCertificationStats,
  getExpiringCertifications,
  getUserCertifications,
  uploadCertificate,
  searchCertifications,
  getTechnologies,
  getDepartments
} from '../controllers/certificationsController';

const router = Router();

// Configuración de almacenamiento para archivos de certificados
const uploadsDir = path.join(__dirname, '../../uploads/certificates');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Todas las rutas de certificaciones requieren autenticación
router.use(authenticate);

// CRUD de certificaciones
router.get('/', getCertifications);
router.post('/', createCertification);
router.get('/stats', getCertificationStats);
router.get('/expiring', getExpiringCertifications);
router.get('/user/:userId', getUserCertifications);
router.get('/search', searchCertifications);
router.get('/technologies', getTechnologies);
router.get('/departments', getDepartments);
router.get('/:id', getCertificationById);
router.put('/:id', updateCertification);
router.delete('/:id', deleteCertification);
router.post('/:id/upload', upload.single('certificate'), uploadCertificate);

export default router;
