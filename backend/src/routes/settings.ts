import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  activateSmtpProfile,
  createSmtpProfile,
  deactivateSmtpProfile,
  deleteSmtpProfile,
  getSmtpProfiles,
  testSmtpProfile,
  updateSmtpProfile,
  getActiveSmtpPolicy
} from '../controllers/smtpProfilesController';
import {
  exportBackup,
  importBackup,
  createPublicApiClient,
  deletePublicApiClient,
  exportReport,
  getAuditLogs,
  getBackupSummary,
  getBranding,
  getPublicApiClients,
  getReportsOverview,
  rotatePublicApiClientKey,
  testPublicApiClient,
  updatePublicApiClient,
  updateBranding,
  systemWipe,
  getSecuritySettings,
  updateSecuritySettings,
  testAdSettings,
  listLocalBackups,
  createManualLocalBackup,
  downloadLocalBackup,
  deleteLocalBackup
} from '../controllers/settingsController';
import { adminOnly, authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    module: 'settings',
    status: 'ok'
  });
});

router.get('/smtp-policy', authenticate, getActiveSmtpPolicy);

router.use(authenticate, adminOnly);

const idValidation = [param('id').isMongoId().withMessage('ID invalido')];

const smtpProfileValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 80 }),
  body('host').trim().notEmpty().withMessage('El host es requerido'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Puerto SMTP invalido'),
  body('secure').isBoolean().withMessage('secure debe ser booleano'),
  body('username').optional({ nullable: true }).trim(),
  body('password').optional({ nullable: true }).isString(),
  body('fromName').trim().notEmpty().withMessage('El nombre remitente es requerido').isLength({ max: 120 }),
  body('fromEmail').isEmail().withMessage('Email remitente invalido').normalizeEmail(),
  body('isActive').optional().isBoolean(),
  body('rejectUnauthorized').optional().isBoolean(),
  body('connectionTimeout').optional().isInt({ min: 3000, max: 60000 })
];

const smtpProfileUpdateValidation = [
  ...idValidation,
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('host').optional().trim().notEmpty(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('secure').optional().isBoolean(),
  body('username').optional({ nullable: true }).trim(),
  body('password').optional({ nullable: true }).isString(),
  body('fromName').optional().trim().notEmpty().isLength({ max: 120 }),
  body('fromEmail').optional().isEmail().withMessage('Email remitente invalido').normalizeEmail(),
  body('isActive').optional().isBoolean(),
  body('rejectUnauthorized').optional().isBoolean(),
  body('connectionTimeout').optional().isInt({ min: 3000, max: 60000 })
];

const testValidation = [
  ...idValidation,
  body('to').optional().isEmail().withMessage('Destinatario invalido').normalizeEmail()
];

const publicApiClientCreateValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 80 }),
  body('description').optional().isString().isLength({ max: 250 }),
  body('apiKey').optional().isString().isLength({ min: 12 }).withMessage('apiKey debe tener al menos 12 caracteres'),
  body('isActive').optional().isBoolean(),
  body('canDownloadFiles').optional().isBoolean(),
  body('rateLimitPerMinute').optional().isInt({ min: 1, max: 10000 }),
  body('maxPageSize').optional().isInt({ min: 1, max: 500 })
];

const publicApiClientUpdateValidation = [
  ...idValidation,
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('description').optional().isString().isLength({ max: 250 }),
  body('apiKey').optional().isString().isLength({ min: 12 }).withMessage('apiKey debe tener al menos 12 caracteres'),
  body('isActive').optional().isBoolean(),
  body('canDownloadFiles').optional().isBoolean(),
  body('rateLimitPerMinute').optional().isInt({ min: 1, max: 10000 }),
  body('maxPageSize').optional().isInt({ min: 1, max: 500 })
];

router.get('/smtp-profiles', getSmtpProfiles);
router.post('/smtp-profiles', smtpProfileValidation, validateRequest, createSmtpProfile);
router.put('/smtp-profiles/:id', smtpProfileUpdateValidation, validateRequest, updateSmtpProfile);
router.delete('/smtp-profiles/:id', idValidation, validateRequest, deleteSmtpProfile);
router.post('/smtp-profiles/:id/activate', idValidation, validateRequest, activateSmtpProfile);
router.post('/smtp-profiles/:id/deactivate', idValidation, validateRequest, deactivateSmtpProfile);
router.post('/smtp-profiles/:id/test', testValidation, validateRequest, testSmtpProfile);

router.get('/audit-logs', getAuditLogs);
router.get('/backup/summary', getBackupSummary);
router.get('/backup/export', exportBackup);
router.post('/backup/import', upload.single('file'), importBackup);
router.post('/backup/system-wipe', systemWipe);
router.get('/backup/local', listLocalBackups);
router.post('/backup/local', createManualLocalBackup);
router.get('/backup/local/download/:filename', downloadLocalBackup);
router.delete('/backup/local/:filename', deleteLocalBackup);
router.get('/branding', getBranding);
router.put('/branding', updateBranding);
router.get('/security', getSecuritySettings);
router.put('/security', updateSecuritySettings);
router.post('/security/test-ad', testAdSettings);
router.get('/public-api/clients', getPublicApiClients);
router.post('/public-api/clients', publicApiClientCreateValidation, validateRequest, createPublicApiClient);
router.put('/public-api/clients/:id', publicApiClientUpdateValidation, validateRequest, updatePublicApiClient);
router.post('/public-api/clients/:id/rotate-key', idValidation, validateRequest, rotatePublicApiClientKey);
router.delete('/public-api/clients/:id', idValidation, validateRequest, deletePublicApiClient);
router.post('/public-api/clients/:id/test', idValidation, validateRequest, testPublicApiClient);
router.get('/reports/overview', getReportsOverview);
router.get('/reports/export', exportReport);

export default router;
