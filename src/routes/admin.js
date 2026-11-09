import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';
import { AppError } from '../utils/app-error.js';
import { clearCatalogCache } from '../services/catalog-context.js';
import { getDashboardStats } from '../services/stats.service.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
const productSchema = z.object({
  brand_id: z.number().int().positive(), category_id: z.number().int().positive(),
  name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).default(''), price: z.number().int().nonnegative(),
  original_price: z.number().int().positive().nullable().default(null), stock: z.number().int().nonnegative(),
  storage: z.string().max(40).default(''), colors: z.array(z.string().max(40)).default([]),
  specs: z.record(z.string(), z.string()).default({}), image_url: z.string().max(500).default('')
}).strict().refine(v => !v.original_price || v.original_price >= v.price, 'Harga awal harus >= harga jual');
const statusSchema = z.object({ status: z.enum(['processing','shipped','out_for_delivery','delivered','cancelled']), note: z.string().max(300).default('') }).strict();

router.get('/stats', (req, res) => success(res, getDashboardStats()));
router.get('/products', (req, res) => {
  const q = String(req.query.q || '');
  const active = req.query.active === 'all' ? '' : 'WHERE is_active=1';
  const rows = db.prepare(`SELECT * FROM products ${active} ${active ? 'AND' : 'WHERE'} name LIKE ? ORDER BY created_at DESC`)
    .all(`%${q}%`);
  success(res, rows.map(parseProduct));
});
router.post('/products', validate(productSchema), (req, res) => {
  validateImage(req.body.image_url);
  const p = req.body;
  const result = db.prepare(`INSERT INTO products(brand_id,category_id,name,slug,description,price,original_price,
    stock,storage,colors,specs,image_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.brand_id,p.category_id,p.name,p.slug,
    p.description,p.price,p.original_price,p.stock,p.storage,JSON.stringify(p.colors),JSON.stringify(p.specs),p.image_url);
  clearCatalogCache();
  success(res, { id: result.lastInsertRowid }, 201);
});
router.put('/products/:id', validate(productSchema), (req, res, next) => {
  validateImage(req.body.image_url);
  const p = req.body;
  const result = db.prepare(`UPDATE products SET brand_id=?,category_id=?,name=?,slug=?,description=?,price=?,
    original_price=?,stock=?,storage=?,colors=?,specs=?,image_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(p.brand_id,p.category_id,p.name,p.slug,p.description,p.price,p.original_price,p.stock,p.storage,
      JSON.stringify(p.colors),JSON.stringify(p.specs),p.image_url,Number(req.params.id));
  if (!result.changes) return next(new AppError(404,'PRODUCT_NOT_FOUND','Produk tidak ditemukan.'));
  clearCatalogCache();
  return success(res, { updated: true });
});
router.delete('/products/:id', (req, res, next) => {
  const result = db.prepare('UPDATE products SET is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(Number(req.params.id));
  if (!result.changes) return next(new AppError(404,'PRODUCT_NOT_FOUND','Produk tidak ditemukan.'));
  clearCatalogCache();
  return success(res, { deleted: true });
});
router.patch('/products/:id/restore', (req, res, next) => {
  const result = db.prepare('UPDATE products SET is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(Number(req.params.id));
  if (!result.changes) return next(new AppError(404,'PRODUCT_NOT_FOUND','Produk tidak ditemukan.'));
  clearCatalogCache();
  return success(res, { restored: true });
});
router.get('/orders', (req, res) => success(res, db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()));
router.patch('/orders/:id/status', validate(statusSchema), (req, res, next) => {
  const order = db.prepare('SELECT id,status FROM orders WHERE id=?').get(Number(req.params.id));
  if (!order) return next(new AppError(404,'ORDER_NOT_FOUND','Pesanan tidak ditemukan.'));
  const result = db.transaction(() => {
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status, order.id);
    db.prepare('INSERT INTO order_tracking(order_id,status,note) VALUES(?,?,?)').run(order.id,req.body.status,req.body.note);
  });
  result();
  return success(res, { updated: true, status: req.body.status });
});
function validateImage(value) {
  if (value && !(/^https:\/\//i.test(value) || /^\/img\//.test(value))) {
    throw new AppError(422,'VALIDATION_ERROR','image_url harus HTTPS atau path /img/.');
  }
}
function parseProduct(p) { return { ...p, colors: JSON.parse(p.colors), specs: JSON.parse(p.specs) }; }
export default router;
