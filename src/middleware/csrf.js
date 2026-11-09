import { AppError } from '../utils/app-error.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function csrfProtection(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(new AppError(403, 'CSRF_REJECTED', 'Origin wajib disertakan.'));
  let parsed;
  try { parsed = new URL(origin); } catch {
    return next(new AppError(403, 'CSRF_REJECTED', 'Origin tidak valid.'));
  }
  if (parsed.host !== req.get('host')) {
    return next(new AppError(403, 'CSRF_REJECTED', 'Origin tidak diizinkan.'));
  }
  return next();
}
