import { Router, Request, Response, NextFunction } from 'express';
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

// Configuracion de almacenamiento para archivos de certificados
const uploadsDir = path.resolve(__dirname, '../../uploads/certificates');
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

const ALLOWED_CERTIFICATE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_CERTIFICATE_FILE_SIZE = Number(process.env.MAX_CERTIFICATE_FILE_SIZE || '5242880');

const upload = multer({
  storage,
  limits: { fileSize: MAX_CERTIFICATE_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_CERTIFICATE_MIME_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Tipo de archivo no permitido'));
  }
});

const uploadCertificateFile = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('certificate')(req, res, (err: unknown) => {
    if (err) {
      const status =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el archivo proporcionado'
      });
      return;
    }
    next();
  });
};

// Todas las rutas de certificaciones requieren autenticacion
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
router.post('/:id/upload', uploadCertificateFile, uploadCertificate);

export default router;
