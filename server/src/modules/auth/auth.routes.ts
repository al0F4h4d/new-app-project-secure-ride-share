import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middlewares/validate.middleware';
import { deviceGuard } from '../../common/middlewares/deviceGuard.middleware';
import { optionalAuthenticate } from '../../common/middlewares/auth.middleware';
import {
  sendOtpValidationSchema,
  verifyOtpValidationSchema,
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
} from './auth.validation';

const router = Router();

/**
 * @route   POST /auth/send-otp
 * @desc    Request Registration / Login SMS OTP
 * @access  Public
 */
router.post(
  '/send-otp',
  validate(sendOtpValidationSchema),
  (req, res, next) => authController.sendOtp(req, res, next)
);

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify SMS OTP
 * @access  Public
 */
router.post(
  '/verify-otp',
  validate(verifyOtpValidationSchema),
  (req, res, next) => authController.verifyOtp(req, res, next)
);

/**
 * @route   POST /auth/register
 * @desc    Complete User Registration
 * @access  Public (Requires registration ticket)
 */
router.post(
  '/register',
  validate(registerValidationSchema),
  (req, res, next) => authController.register(req, res, next)
);

/**
 * @route   POST /auth/login
 * @desc    User Login (Phone + Password) with Device Blacklist Gate
 * @access  Public
 */
router.post(
  '/login',
  validate(loginValidationSchema),
  deviceGuard,
  (req, res, next) => authController.login(req, res, next)
);

/**
 * @route   POST /auth/refresh-token
 * @desc    Single-Use Refresh Token Rotation
 * @access  Public (Reads HttpOnly cookie or body)
 */
router.post(
  '/refresh-token',
  validate(refreshTokenValidationSchema),
  (req, res, next) => authController.refreshToken(req, res, next)
);

/**
 * @route   POST /auth/logout
 * @desc    User Logout (Invalidates Refresh Token Family)
 * @access  Public / Authenticated
 */
router.post(
  '/logout',
  optionalAuthenticate,
  (req, res, next) => authController.logout(req, res, next)
);

export const authRoutes = router;

