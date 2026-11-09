import { rateLimit } from 'express-rate-limit';

export const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300,
  standardHeaders: 'draft-8', legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-8', legacyHeaders: false });
export const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20,
  standardHeaders: 'draft-8', legacyHeaders: false });
