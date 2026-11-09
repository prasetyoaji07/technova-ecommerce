import { AppError } from '../utils/app-error.js';
import { failure } from '../utils/response.js';

export function notFound(req, res) {
  return failure(res, 'NOT_FOUND', 'Endpoint tidak ditemukan.', [], 404);
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message = error instanceof AppError ? error.message : 'Terjadi kesalahan pada server.';
  if (status >= 500) console.error(error.message);
  return failure(res, code, message, error.details || [], status);
}
