import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

const API_PREFIX = '/api';
const HEALTH_PATH = '/api/health';
const limits = config.rateLimit;
const common = { standardHeaders: 'draft-8', legacyHeaders: false };
const globalLimit = config.nodeEnv === 'development' ? limits.globalLimitDevelopment : limits.globalLimit;

// File statis dan /api/health tidak dihitung; hanya request API.
const skipNonApi = req => !req.path.startsWith(API_PREFIX) || req.path === HEALTH_PATH;

export const globalLimiter = rateLimit({ ...common, windowMs: limits.windowMs, limit: globalLimit, skip: skipNonApi });
export const authLimiter = rateLimit({ ...common, windowMs: limits.windowMs, limit: limits.authLimit });
export const chatLimiter = rateLimit({ ...common, windowMs: limits.chatWindowMs, limit: limits.chatLimit });
