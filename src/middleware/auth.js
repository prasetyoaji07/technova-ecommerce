import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { AppError } from '../utils/app-error.js';

export function optionalAuth(req, res, next) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub);
  } catch {}
  return next();
}
export function requireAuth(req, res, next) {
  optionalAuth(req, res, error => {
    if (error) return next(error);
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu.'));
    return next();
  });
}
export function blockAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next(new AppError(403, 'ADMIN_CANNOT_SHOP', 'Akun admin tidak dapat berbelanja.'));
  return next();
}
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return next(new AppError(403, 'FORBIDDEN', 'Akses ditolak.'));
    return next();
  };
}
