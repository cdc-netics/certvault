import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  activateSmtpProfile,
  createSmtpProfile,
  deactivateSmtpProfile,
  deleteSmtpProfile,
  getSmtpProfiles,
  testSmtpProfile,
  updateSmtpProfile
} from '../controllers/smtpProfilesController';
import {
  exportBackup,
  exportReport,
  getAuditLogs,
  getBackupSummary,
  getBranding,
  getReportsOverview,
  updateBranding
} from '../controllers/settingsController';
import { adminOnly, authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    module: 'settings',
    status: 'ok'
  });
});

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
router.get('/branding', getBranding);
router.put('/branding', updateBranding);
router.get('/reports/overview', getReportsOverview);
router.get('/reports/export', exportReport);

export default router;
