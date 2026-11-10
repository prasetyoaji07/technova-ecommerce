import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, blockAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';
import { AppError } from '../utils/app-error.js';

const router = Router();
router.use(requireAuth, blockAdmin);
const addSchema = z.object({ product_id: z.number().int().positive(), color: z.string().max(40).default(''),
  qty: z.number().int().min(1).max(10) }).strict();
const qtySchema = z.object({ qty: z.number().int().min(1).max(10) }).strict();

router.get('/', (req, res) => success(res, getCart(req.user.id)));
router.post('/', validate(addSchema), (req, res) => {
  const { product_id, color, qty } = req.body;
  const product = db.prepare('SELECT id,stock FROM products WHERE id=? AND is_active=1').get(product_id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produk tidak tersedia.');
  const existing = db.prepare('SELECT id,qty FROM cart_items WHERE user_id=? AND product_id=? AND color=?')
    .get(req.user.id, product_id, color);
  const nextQty = (existing?.qty || 0) + qty;
  if (nextQty > 10 || nextQty > product.stock) throw new AppError(422, 'STOCK_LIMIT', 'Jumlah melebihi batas stok atau qty.');
  if (existing) db.prepare('UPDATE cart_items SET qty=? WHERE id=?').run(nextQty, existing.id);
  else db.prepare('INSERT INTO cart_items(user_id,product_id,color,qty) VALUES(?,?,?,?)').run(req.user.id, product_id, color, qty);
  success(res, getCart(req.user.id), 201);
});
router.patch('/:id', validate(qtySchema), (req, res) => {
  const item = db.prepare(`SELECT ci.id,p.stock FROM cart_items ci JOIN products p ON p.id=ci.product_id
    WHERE ci.id=? AND ci.user_id=?`).get(Number(req.params.id), req.user.id);
  if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Item keranjang tidak ditemukan.');
  if (req.body.qty > item.stock) throw new AppError(422, 'STOCK_LIMIT', 'Stok tidak mencukupi.');
  db.prepare('UPDATE cart_items SET qty=? WHERE id=?').run(req.body.qty, item.id);
  success(res, getCart(req.user.id));
});
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id=? AND user_id=?').run(Number(req.params.id), req.user.id);
  success(res, getCart(req.user.id));
});
function getCart(userId) {
  const items = db.prepare(`SELECT ci.id,ci.product_id,ci.color,ci.qty,p.name,p.slug,p.price,p.image_url,p.stock
    FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=? ORDER BY ci.created_at DESC`).all(userId);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { items, subtotal };
}
export default router;
