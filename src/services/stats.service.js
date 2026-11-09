import { db } from '../db/connection.js';

export function getDashboardStats() {
  const kpi = db.prepare(`SELECT COALESCE(SUM(CASE WHEN status!='cancelled' THEN total ELSE 0 END),0) revenue,
    COUNT(*) orders, ROUND(COALESCE(AVG(CASE WHEN status!='cancelled' THEN total END),0)) aov,
    COUNT(DISTINCT user_id) buyers,
    ROUND(100.0*SUM(status='cancelled')/MAX(COUNT(*),1),2) cancelled_pct FROM orders`).get();
  const daily = db.prepare(`SELECT date(created_at) day,SUM(total) revenue,COUNT(*) orders
    FROM orders WHERE status!='cancelled' GROUP BY date(created_at) ORDER BY day`).all();
  const topProducts = db.prepare(`SELECT product_name,SUM(qty) units,SUM(unit_price*qty) revenue
    FROM order_items GROUP BY product_id ORDER BY revenue DESC LIMIT 5`).all();
  const brands = db.prepare(`SELECT b.name brand,SUM(oi.unit_price*oi.qty) revenue FROM order_items oi
    JOIN products p ON p.id=oi.product_id JOIN brands b ON b.id=p.brand_id GROUP BY b.id ORDER BY revenue DESC`).all();
  const statuses = db.prepare('SELECT status,COUNT(*) count FROM orders GROUP BY status').all();
  return { kpi, daily, top_products: topProducts, revenue_by_brand: brands, order_status: statuses };
}
