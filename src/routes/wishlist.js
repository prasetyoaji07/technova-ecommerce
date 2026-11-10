import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, blockAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(requireAuth, blockAdmin);
const schema = z.object({ product_id: z.number().int().positive() }).strict();
router.get('/', (req, res) => {
  const items = db.prepare(`SELECT p.id,p.name,p.slug,p.price,p.image_url,p.stock
    FROM wishlists w JOIN products p ON p.id=w.product_id
    WHERE w.user_id=? AND p.is_active=1 ORDER BY w.created_at DESC`).all(req.user.id);
  success(res, items);
});
router.post('/', validate(schema), (req, res) => {
  db.prepare('INSERT OR IGNORE INTO wishlists(user_id,product_id) SELECT ?,id FROM products WHERE id=? AND is_active=1')
    .run(req.user.id, req.body.product_id);
  success(res, { saved: true }, 201);
});
router.delete('/:productId', (req, res) => {
  db.prepare('DELETE FROM wishlists WHERE user_id=? AND product_id=?').run(req.user.id, Number(req.params.productId));
  success(res, { removed: true });
});
export default router;
