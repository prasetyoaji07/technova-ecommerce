import { Router } from 'express';
import { db } from '../db/connection.js';
import { success } from '../utils/response.js';
import { AppError } from '../utils/app-error.js';

const router = Router();
const sortMap = { price_asc: 'p.price ASC', price_desc: 'p.price DESC',
  newest: 'p.created_at DESC', popular: 'p.is_best_seller DESC, p.rating_avg DESC' };

router.get('/', (req, res) => {
  const { q = '', brand, category, min, max, sort = 'popular', deal, page = '1', limit = '12' } = req.query;
  const p = Math.max(1, Math.min(10000, Number(page) || 1));
  const l = Math.max(1, Math.min(50, Number(limit) || 12));
  const where = ['p.is_active = 1'];
  const args = [];
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (brand) { where.push('b.slug = ?'); args.push(brand); }
  if (category) { where.push('c.slug = ?'); args.push(category); }
  if (min !== undefined) { where.push('p.price >= ?'); args.push(Number(min) || 0); }
  if (max !== undefined) { where.push('p.price <= ?'); args.push(Number(max) || 0); }
  if (deal === 'true') where.push('p.original_price IS NOT NULL');
  const clause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) n FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id WHERE ${clause}`).get(...args).n;
  const order = sortMap[sort] || sortMap.popular;
  const rows = db.prepare(`SELECT p.*,b.name brand,c.name category FROM products p
    JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
    WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, l, (p - 1) * l);
  success(res, { items: rows.map(formatProduct), pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
});
router.get('/:slug', (req, res, next) => {
  const row = db.prepare(`SELECT p.*,b.name brand,c.name category FROM products p
    JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
    WHERE p.slug=? AND p.is_active=1`).get(req.params.slug);
  if (!row) return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Produk tidak ditemukan.'));
  return success(res, formatProduct(row));
});
function formatProduct(row) {
  return { ...row, colors: JSON.parse(row.colors), specs: JSON.parse(row.specs),
    is_best_seller: Boolean(row.is_best_seller), is_active: Boolean(row.is_active) };
}
export default router;
