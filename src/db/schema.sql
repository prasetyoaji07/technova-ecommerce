CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK(price >= 0),
  original_price INTEGER CHECK(original_price IS NULL OR original_price >= price),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  storage TEXT NOT NULL DEFAULT '',
  colors TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(colors)),
  specs TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(specs)),
  image_url TEXT NOT NULL DEFAULT '',
  rating_avg REAL NOT NULL DEFAULT 0 CHECK(rating_avg BETWEEN 0 AND 5),
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_count >= 0),
  is_best_seller INTEGER NOT NULL DEFAULT 0 CHECK(is_best_seller IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  color TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id, color)
);
CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'placed' CHECK(status IN ('placed','processing','shipped','out_for_delivery','delivered','cancelled')),
  subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
  shipping_fee INTEGER NOT NULL CHECK(shipping_fee >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  ship_name TEXT NOT NULL,
  ship_address TEXT NOT NULL,
  ship_city TEXT NOT NULL,
  ship_postal_code TEXT NOT NULL,
  ship_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('card','paypal','apple_pay','cod')),
  payment_status TEXT NOT NULL CHECK(payment_status IN ('pending','paid','failed')),
  estimated_delivery TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  color TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('placed','processing','shipped','out_for_delivery','delivered','cancelled')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_reply TEXT NOT NULL,
  recommended_product_ids TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(recommended_product_ids)),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  is_error INTEGER NOT NULL DEFAULT 0 CHECK(is_error IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_catalog ON products(is_active, brand_id, category_id, price);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_logs(created_at);
