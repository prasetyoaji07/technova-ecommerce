import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, blockAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrder } from '../services/order.service.js';
import { success } from '../utils/response.js';
import { AppError } from '../utils/app-error.js';

const router = Router();
router.use(requireAuth, blockAdmin);
const NAME_PATTERN = /^[\p{L}][\p{L}\s.'’-]*$/u;
const POSTAL_PATTERN = /^\d{5}$/;
const PHONE_PATTERN = /^(?:\+62|62|0)8\d{8,12}$/;
const checkoutSchema = z.object({
  ship_name: z.string().trim().min(2).max(100).regex(NAME_PATTERN, 'Nama hanya boleh berisi huruf.'),
  ship_address: z.string().trim().min(5).max(300).regex(/\p{L}/u, 'Alamat harus memuat huruf.'),
  ship_city: z.string().trim().min(2).max(100).regex(NAME_PATTERN, 'Kota hanya boleh berisi huruf.'),
  ship_postal_code: z.string().trim().regex(POSTAL_PATTERN, 'Kode pos harus 5 digit angka.'),
  ship_phone: z.string().trim().regex(PHONE_PATTERN, 'Nomor telepon tidak valid.'),
  payment_method: z.enum(['card','paypal','apple_pay','cod'])
}).strict();

router.post('/', validate(checkoutSchema), (req, res) => success(res, createOrder(req.user.id, req.body), 201));
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  success(res, rows);
});
router.get('/:orderNumber', (req, res, next) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number=? AND user_id=?')
    .get(req.params.orderNumber, req.user.id);
  if (!order) return next(new AppError(404, 'ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.'));
  const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
  const tracking = db.prepare('SELECT status,note,created_at FROM order_tracking WHERE order_id=? ORDER BY created_at,id').all(order.id);
  return success(res, { ...order, items, tracking });
});
export default router;
