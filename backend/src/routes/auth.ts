import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMyActivity
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
    .matches(/^\w+$/)
    .withMessage('El nombre de usuario solo puede contener letras, numeros y guiones bajos'),
  body('email').isEmail().withMessage('Email invalido').normalizeEmail(),
  body('personalEmail').isEmail().withMessage('Correo personal invalido').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayuscula, una minuscula y un numero'),
  body('firstName').notEmpty().withMessage('El nombre es requerido').isLength({ max: 50 }),
  body('lastName').notEmpty().withMessage('El apellido es requerido').isLength({ max: 50 }),
  body('department').notEmpty().withMessage('El departamento es requerido'),
  body('position').optional()
];

const loginValidation = [
  body('email').isEmail().withMessage('Email invalido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

const forgotPasswordValidation = [body('email').isEmail().withMessage('Email invalido').normalizeEmail()];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('El token es requerido'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('email').optional().isEmail().withMessage('Email invalido').normalizeEmail()
];

const verifyEmailValidation = [
  body('token').notEmpty().withMessage('Token de verificacion requerido'),
  body('email').optional().isEmail().withMessage('Email invalido').normalizeEmail()
];

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);
router.post('/verify-email', verifyEmailValidation, validateRequest, verifyEmail);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.get('/my-activity', authenticate, getMyActivity);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
