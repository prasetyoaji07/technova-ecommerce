-- KPI penjualan: mengecualikan order yang dibatalkan dari revenue.
SELECT COUNT(*) AS total_order,
       SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) AS revenue,
       ROUND(AVG(CASE WHEN status <> 'cancelled' THEN total END)) AS aov,
       COUNT(DISTINCT user_id) AS unique_buyers,
       ROUND(100.0 * SUM(status='cancelled') / MAX(COUNT(*),1), 2) AS cancelled_pct
FROM orders;

-- Tren revenue harian.
SELECT date(created_at) AS day, SUM(total) AS revenue, COUNT(*) AS orders
FROM orders WHERE status <> 'cancelled' GROUP BY date(created_at) ORDER BY day;

-- Produk teratas berdasarkan revenue dan unit.
SELECT product_name, SUM(unit_price*qty) AS revenue, SUM(qty) AS units
FROM order_items GROUP BY product_id ORDER BY revenue DESC LIMIT 5;

-- Revenue per brand.
SELECT b.name, SUM(oi.unit_price*oi.qty) AS revenue
FROM order_items oi JOIN products p ON p.id=oi.product_id
JOIN brands b ON b.id=p.brand_id GROUP BY b.id ORDER BY revenue DESC;

-- Distribusi status pesanan dan metode pembayaran.
SELECT status, COUNT(*) AS total FROM orders GROUP BY status;
SELECT payment_method, COUNT(*) AS total FROM orders GROUP BY payment_method;

-- Repeat buyer.
SELECT user_id, COUNT(*) AS orders, SUM(total) AS spend
FROM orders WHERE status <> 'cancelled' GROUP BY user_id ORDER BY orders DESC;
