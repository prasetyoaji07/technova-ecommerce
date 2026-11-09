import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initializeDatabase } from '../src/db/connection.js';

initializeDatabase();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kpi = db.prepare(`SELECT COALESCE(SUM(CASE WHEN status!='cancelled' THEN total ELSE 0 END),0) revenue,
  COUNT(*) orders,ROUND(AVG(CASE WHEN status!='cancelled' THEN total END)) aov,
  COUNT(DISTINCT user_id) buyers,ROUND(100.0*SUM(status='cancelled')/MAX(COUNT(*),1),2) cancelled_pct
  FROM orders`).get();
const daily = db.prepare(`SELECT date(created_at) day,SUM(total) revenue,COUNT(*) orders FROM orders
  WHERE status!='cancelled' GROUP BY date(created_at) ORDER BY day`).all();
const top = db.prepare(`SELECT product_name,SUM(unit_price*qty) revenue,SUM(qty) units
  FROM order_items GROUP BY product_id ORDER BY revenue DESC LIMIT 5`).all();
const brand = db.prepare(`SELECT b.name brand,SUM(oi.unit_price*oi.qty) revenue FROM order_items oi
  JOIN products p ON p.id=oi.product_id JOIN brands b ON b.id=p.brand_id GROUP BY b.id ORDER BY revenue DESC`).all();
const status = db.prepare('SELECT status,COUNT(*) total FROM orders GROUP BY status').all();
const payment = db.prepare('SELECT payment_method,COUNT(*) total FROM orders GROUP BY payment_method').all();
const repeat = db.prepare(`SELECT COUNT(*) FROM (SELECT user_id FROM orders WHERE status!='cancelled'
  GROUP BY user_id HAVING COUNT(*)>1)`).pluck().get();
const md = `# Hasil Query Analisis TechNova\n\nDihasilkan otomatis dari database SQLite pada ${new Date().toISOString()}.\n\n`+
  `## KPI\n\n| Metrik | Hasil |\n|---|---:|\n| Revenue | ${kpi.revenue} |\n| Order | ${kpi.orders} |\n| AOV | ${kpi.aov||0} |\n| Pembeli unik | ${kpi.buyers} |\n| Order dibatalkan | ${kpi.cancelled_pct||0}% |\n\n`+
  `## Tren Harian\n\n${table(['Tanggal','Revenue','Order'],daily.map(x=>[x.day,x.revenue,x.orders]))}\n\n`+
  `## Top Produk\n\n${table(['Produk','Revenue','Unit'],top.map(x=>[x.product_name,x.revenue,x.units]))}\n\n`+
  `## Revenue per Brand\n\n${table(['Brand','Revenue'],brand.map(x=>[x.brand,x.revenue]))}\n\n`+
  `## Status Order\n\n${table(['Status','Jumlah'],status.map(x=>[x.status,x.total]))}\n\n`+
  `## Metode Pembayaran\n\n${table(['Metode','Jumlah'],payment.map(x=>[x.payment_method,x.total]))}\n\n`+
  `Repeat buyer: ${repeat} customer.\n`;
const output = path.join(root,'docs/analisis/hasil_query.md');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,md);
console.info(`Analisis ditulis: ${output}`);
db.close();

function table(headers, rows) {
  return `| ${headers.join(' | ')} |\n| ${headers.map(()=> '---').join(' | ')} |\n`+
    rows.map(row=>`| ${row.map(v=>String(v ?? '').replaceAll('|','/')).join(' | ')} |`).join('\n');
}
