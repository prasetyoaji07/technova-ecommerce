import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { register, login } from '../services/auth.service.js';
import { config } from '../config.js';
import { success } from '../utils/response.js';

const router = Router();
const passwordRule = z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/);
const registerSchema = z.object({ name: z.string().trim().min(2).max(80),
  email: z.string().email().max(180), password: passwordRule }).strict();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) }).strict();

router.post('/register', validate(registerSchema), async (req, res) => {
  success(res, await register(req.body), 201);
});
router.post('/login', validate(loginSchema), async (req, res) => {
  const result = await login(req.body);
  res.cookie(config.cookieName, result.token, { httpOnly: true, sameSite: 'strict',
    secure: config.nodeEnv === 'production', maxAge: 2 * 60 * 60 * 1000, path: '/' });
  success(res, { user: result.user });
});
router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'strict',
    secure: config.nodeEnv === 'production', path: '/' });
  success(res, { message: 'Berhasil logout.' });
});
router.get('/me', requireAuth, (req, res) => success(res, { user: req.user }));
export default router;
