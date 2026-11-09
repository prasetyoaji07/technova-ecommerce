import { db } from '../db/connection.js';
import { config } from '../config.js';
import { AppError } from '../utils/app-error.js';

const createOrderTransaction = db.transaction((userId, input) => {
  const cart = db.prepare(`SELECT ci.product_id,ci.color,ci.qty,p.name,p.price,p.stock,p.is_active
    FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=?`).all(userId);
  if (!cart.length) throw new AppError(422, 'CART_EMPTY', 'Keranjang masih kosong.');
  let subtotal = 0;
  for (const item of cart) {
    if (!item.is_active || item.stock < item.qty) throw new AppError(422, 'STOCK_UNAVAILABLE', `Stok ${item.name} tidak mencukupi.`);
    subtotal += item.price * item.qty;
  }
  const shipping = subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;
  const paymentStatus = input.payment_method === 'cod' ? 'pending' : 'paid';
  const orderNumber = makeOrderNumber();
  const delivery = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const order = db.prepare(`INSERT INTO orders(order_number,user_id,status,subtotal,shipping_fee,total,
    ship_name,ship_address,ship_city,ship_postal_code,ship_phone,payment_method,payment_status,estimated_delivery)
    VALUES(?,?, 'placed',?,?,?,?,?,?,?,?,?,?,?)`).run(orderNumber,userId,subtotal,shipping,subtotal+shipping,
    input.ship_name,input.ship_address,input.ship_city,input.ship_postal_code,input.ship_phone,
    input.payment_method,paymentStatus,delivery);
  const orderId = order.lastInsertRowid;
  const addItem = db.prepare(`INSERT INTO order_items(order_id,product_id,product_name,unit_price,color,qty)
    VALUES(?,?,?,?,?,?)`);
  const reduce = db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?');
  for (const item of cart) {
    const changed = reduce.run(item.qty,item.product_id,item.qty);
    if (!changed.changes) throw new AppError(422, 'STOCK_UNAVAILABLE', 'Stok berubah. Periksa keranjang.');
    addItem.run(orderId,item.product_id,item.name,item.price,item.color,item.qty);
  }
  db.prepare('INSERT INTO order_tracking(order_id,status,note) VALUES(?,?,?)').run(orderId,'placed','Pesanan berhasil dibuat.');
  db.prepare('DELETE FROM cart_items WHERE user_id=?').run(userId);
  return { order_number: orderNumber, status: 'placed', subtotal, shipping_fee: shipping, total: subtotal + shipping,
    payment_status: paymentStatus, estimated_delivery: delivery };
});
export function createOrder(userId, input) { return createOrderTransaction(userId, input); }
function makeOrderNumber() {
  for (let i = 0; i < 20; i += 1) {
    const number = `TN${String(Math.floor(100000 + Math.random() * 900000))}`;
    if (!db.prepare('SELECT id FROM orders WHERE order_number=?').get(number)) return number;
  }
  throw new AppError(500, 'ORDER_NUMBER_FAILED', 'Nomor pesanan gagal dibuat.');
}
