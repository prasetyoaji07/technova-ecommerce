import { db } from '../db/connection.js';

let cached = null;
let cachedAt = 0;
export function getCatalogContext() {
  if (cached && Date.now() - cachedAt < 60000) return cached;
  const rows = db.prepare(`SELECT p.id,p.name,b.name brand,c.name category,p.price,p.original_price,
    p.stock,p.storage,p.colors,p.specs FROM products p JOIN brands b ON b.id=p.brand_id
    JOIN categories c ON c.id=p.category_id WHERE p.is_active=1 ORDER BY p.is_best_seller DESC LIMIT 40`).all();
  cached = rows.map(p => `${p.id} | ${p.name} | ${p.brand} | ${p.category} | Rp${p.price} | diskon:${p.original_price ? Math.round((1-p.price/p.original_price)*100)+'%' : 'tidak'} | stok:${p.stock===0?'habis':p.stock<5?'menipis':'tersedia'} | ${p.storage} | ${p.colors} | ${p.specs}`).join('\n');
  cachedAt = Date.now();
  return cached;
}
export function clearCatalogCache() { cached = null; }
