import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, initializeDatabase } from './connection.js';
import { config } from '../config.js';

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261110);
const pick = items => items[Math.floor(rand() * items.length)];
const reset = process.argv.includes('--reset');

initializeDatabase();
if (reset) {
  db.exec(`
    DELETE FROM order_tracking;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM chat_logs;
    DELETE FROM wishlists;
    DELETE FROM cart_items;
    DELETE FROM newsletter_subscribers;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM brands;
    DELETE FROM users;
  `);
}

const insertBrand = db.prepare('INSERT OR IGNORE INTO brands(name,slug) VALUES(?,?)');
const brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'realme'];
brands.forEach(name => insertBrand.run(name, name.toLowerCase()));

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)');
insertCategory.run('Smartphone', 'smartphone');
insertCategory.run('Aksesori', 'aksesori');

const brandId = name => db.prepare('SELECT id FROM brands WHERE name=?').get(name).id;
const catPhone = db.prepare("SELECT id FROM categories WHERE slug='smartphone'").get().id;
const catAccessory = db.prepare("SELECT id FROM categories WHERE slug='aksesori'").get().id;

const products = [
  {
    brand: 'Apple', name: 'iPhone 16 Pro', slug: 'iphone-16-pro', price: 18999000, originalPrice: 19999000,
    stock: 18, storage: '256 GB', colors: ['Natural Titanium', 'Desert Titanium', 'Black Titanium', 'White Titanium'], bestSeller: 1,
    description: 'Kamera Pro dengan sensor 48 MP dan perekaman video berkualitas tinggi membantu menghasilkan foto serta video yang detail. Chip A18 Pro juga memberi performa cepat untuk editing dan game berat.',
    specs: { display: '6.3 inci LTPO Super Retina XDR OLED, 120Hz', chip: 'Apple A18 Pro', camera: '48 MP utama + 48 MP ultrawide + 12 MP telefoto 5x', battery: '3582 mAh', network: '5G, Wi-Fi 7', fast_charge: '27W kabel, MagSafe 25W' }
  },
  {
    brand: 'Samsung', name: 'Galaxy S24', slug: 'galaxy-s24', price: 12999000, originalPrice: null,
    stock: 24, storage: '256 GB', colors: ['Onyx Black', 'Marble Gray', 'Cobalt Violet', 'Amber Yellow'], bestSeller: 1,
    description: 'Galaxy S24 menawarkan layar Dynamic AMOLED yang cerah dan fitur Galaxy AI untuk membantu aktivitas harian. Kamera utama 50 MP cocok untuk foto tajam dalam berbagai kondisi.',
    specs: { display: '6.2 inci Dynamic AMOLED 2X, 120Hz', chip: 'Exynos 2400', camera: '50 MP utama + 12 MP ultrawide + 10 MP telefoto 3x', battery: '4000 mAh', network: '5G, Wi-Fi 6E', fast_charge: '25W kabel, 15W nirkabel' }
  },
  {
    brand: 'Google', name: 'Pixel 9', slug: 'pixel-9', price: 11999000, originalPrice: null,
    stock: 15, storage: '128 GB', colors: ['Obsidian', 'Porcelain', 'Wintergreen', 'Peony'], bestSeller: 1,
    description: 'Pixel 9 mengandalkan pemrosesan fotografi Google untuk menghasilkan warna natural dan foto malam yang bersih. Fitur AI bawaan membantu menyunting foto serta merangkum aktivitas dengan praktis.',
    specs: { display: '6.3 inci Actua OLED, 120Hz', chip: 'Google Tensor G4', camera: '50 MP utama + 48 MP ultrawide', battery: '4700 mAh', network: '5G, Wi-Fi 7', fast_charge: '27W kabel, 15W nirkabel' }
  },
  {
    brand: 'OnePlus', name: 'OnePlus 12', slug: 'oneplus-12', price: 13999000, originalPrice: null,
    stock: 12, storage: '256 GB', colors: ['Silky Black', 'Flowy Emerald', 'Glacial White'], bestSeller: 1,
    description: 'OnePlus 12 dirancang untuk performa flagship dengan Snapdragon 8 Gen 3 dan layar QHD+ yang halus. Baterai besar serta pengisian 100W membuatnya nyaman untuk gaming dan penggunaan intensif.',
    specs: { display: '6.82 inci LTPO AMOLED QHD+, 120Hz', chip: 'Snapdragon 8 Gen 3', camera: '50 MP utama + 64 MP periskop 3x + 48 MP ultrawide', battery: '5400 mAh', network: '5G, Wi-Fi 7', fast_charge: '100W kabel, 50W nirkabel' }
  },
  {
    brand: 'Apple', name: 'iPhone 15', slug: 'iphone-15', price: 10999000, originalPrice: 12999000,
    stock: 20, storage: '128 GB', colors: ['Black', 'Blue', 'Green', 'Pink'], bestSeller: 0,
    description: 'iPhone 15 menghadirkan kamera utama 48 MP dengan detail tinggi dan Dynamic Island untuk akses informasi cepat. Pilihan seimbang bagi pengguna yang menginginkan pengalaman iOS dalam bodi ringkas.',
    specs: { display: '6.1 inci Super Retina XDR OLED, 60Hz', chip: 'Apple A16 Bionic', camera: '48 MP utama + 12 MP ultrawide', battery: '3349 mAh', network: '5G, Wi-Fi 6', fast_charge: '20W kabel, MagSafe 15W' }
  },
  {
    brand: 'Samsung', name: 'Galaxy S23', slug: 'galaxy-s23', price: 8999000, originalPrice: 10999000,
    stock: 17, storage: '256 GB', colors: ['Phantom Black', 'Cream', 'Green', 'Lavender'], bestSeller: 0,
    description: 'Galaxy S23 tetap menarik untuk penggunaan sehari-hari berkat Snapdragon 8 Gen 2 dan kamera telefoto optik 3x. Ukurannya compact sehingga nyaman digunakan dengan satu tangan.',
    specs: { display: '6.1 inci Dynamic AMOLED 2X, 120Hz', chip: 'Snapdragon 8 Gen 2 for Galaxy', camera: '50 MP utama + 12 MP ultrawide + 10 MP telefoto 3x', battery: '3900 mAh', network: '5G, Wi-Fi 6E', fast_charge: '25W kabel, 15W nirkabel' }
  },
  {
    brand: 'Google', name: 'Pixel 8', slug: 'pixel-8', price: 7999000, originalPrice: 9499000,
    stock: 9, storage: '128 GB', colors: ['Obsidian', 'Hazel', 'Rose', 'Mint'], bestSeller: 0,
    description: 'Pixel 8 cocok untuk pencinta fotografi point-and-shoot dengan HDR dan Night Sight yang konsisten. Dukungan pembaruan jangka panjang membuatnya menarik untuk pemakaian bertahun-tahun.',
    specs: { display: '6.2 inci Actua OLED, 120Hz', chip: 'Google Tensor G3', camera: '50 MP utama + 12 MP ultrawide', battery: '4575 mAh', network: '5G, Wi-Fi 7', fast_charge: '27W kabel, 18W nirkabel' }
  },
  {
    brand: 'OnePlus', name: 'OnePlus Nord 3', slug: 'oneplus-nord-3', price: 5999000, originalPrice: 6999000,
    stock: 22, storage: '256 GB', colors: ['Misty Green', 'Tempest Gray', 'Aqua Surge'], bestSeller: 0,
    description: 'Nord 3 menawarkan chipset Dimensity 9000 yang bertenaga di kelas menengah dan layar AMOLED 120Hz. Pengisian 80W membantu mengisi baterai besar dalam waktu singkat.',
    specs: { display: '6.74 inci Fluid AMOLED, 120Hz', chip: 'MediaTek Dimensity 9000', camera: '50 MP utama OIS + 8 MP ultrawide + 2 MP macro', battery: '5000 mAh', network: '5G, Wi-Fi 6', fast_charge: '80W SUPERVOOC' }
  },
  {
    brand: 'Xiaomi', name: 'Xiaomi 14', slug: 'xiaomi-14', price: 10999000, originalPrice: null,
    stock: 19, storage: '256 GB', colors: ['Black', 'White', 'Jade Green'], bestSeller: 0,
    description: 'Xiaomi 14 memadukan kamera Leica dengan lensa serbaguna untuk foto portrait dan lanskap. Ukuran flagship yang ringkas tetap dibekali Snapdragon 8 Gen 3 dan pengisian cepat 90W.',
    specs: { display: '6.36 inci LTPO AMOLED, 120Hz', chip: 'Snapdragon 8 Gen 3', camera: '50 MP utama Leica + 50 MP telefoto + 50 MP ultrawide', battery: '4610 mAh', network: '5G, Wi-Fi 7', fast_charge: '90W kabel, 50W nirkabel' }
  },
  {
    brand: 'Xiaomi', name: 'Redmi Note 13 Pro', slug: 'redmi-note-13-pro', price: 4299000, originalPrice: null,
    stock: 3, storage: '256 GB', colors: ['Midnight Black', 'Aurora Purple', 'Ocean Teal', 'Arctic White'], bestSeller: 0,
    description: 'Redmi Note 13 Pro menonjolkan kamera 200 MP dengan OIS untuk menangkap detail foto lebih banyak. Layar AMOLED 120Hz dan baterai 5100 mAh mendukung hiburan sepanjang hari.',
    specs: { display: '6.67 inci AMOLED 1.5K, 120Hz', chip: 'Snapdragon 7s Gen 2', camera: '200 MP utama OIS + 8 MP ultrawide + 2 MP macro', battery: '5100 mAh', network: '5G, Wi-Fi 5', fast_charge: '67W Turbo Charge' }
  },
  {
    brand: 'realme', name: 'realme 13 Pro+', slug: 'realme-13-pro-plus', price: 6499000, originalPrice: null,
    stock: 13, storage: '256 GB', colors: ['Monet Gold', 'Emerald Green', 'Monet Purple'], bestSeller: 0,
    description: 'realme 13 Pro+ mengutamakan fotografi portrait dengan kamera periskop dan pemrosesan gambar berbasis AI. Desainnya terinspirasi karya seni Monet dengan baterai besar untuk aktivitas harian.',
    specs: { display: '6.7 inci Curved OLED, 120Hz', chip: 'Snapdragon 7s Gen 2', camera: '50 MP utama OIS + 50 MP periskop 3x + 8 MP ultrawide', battery: '5200 mAh', network: '5G, Wi-Fi 6', fast_charge: '80W SUPERVOOC' }
  },
  {
    brand: 'realme', name: 'realme C67', slug: 'realme-c67', price: 2499000, originalPrice: null,
    stock: 0, storage: '128 GB', colors: ['Sunny Oasis', 'Black Rock', 'Purple Bloom'], bestSeller: 0,
    description: 'realme C67 menawarkan kamera 108 MP untuk pengguna yang ingin mengambil foto beresolusi tinggi dengan harga terjangkau. Layar 90Hz dan baterai 5000 mAh menunjang kebutuhan dasar sehari-hari.',
    specs: { display: '6.72 inci IPS LCD, 90Hz', chip: 'Snapdragon 685', camera: '108 MP utama + 2 MP depth', battery: '5000 mAh', network: '4G LTE, Wi-Fi 5', fast_charge: '33W SUPERVOOC' }
  },
  {
    brand: 'Apple', name: 'iPhone 14', slug: 'iphone-14', price: 8999000, originalPrice: null,
    stock: 7, storage: '128 GB', colors: ['Midnight', 'Starlight', 'Blue', 'Purple'], bestSeller: 0,
    description: 'iPhone 14 menghadirkan hasil video stabil dengan Action Mode dan kamera ganda yang mudah diandalkan. Fitur keselamatan serta performa A15 Bionic menjadikannya pilihan iPhone yang praktis.',
    specs: { display: '6.1 inci Super Retina XDR OLED, 60Hz', chip: 'Apple A15 Bionic', camera: '12 MP utama sensor-shift OIS + 12 MP ultrawide', battery: '3279 mAh', network: '5G, Wi-Fi 6', fast_charge: '20W kabel, MagSafe 15W' }
  },
  {
    brand: 'Samsung', name: 'Galaxy A55', slug: 'galaxy-a55', price: 5999000, originalPrice: null,
    stock: 4, storage: '256 GB', colors: ['Awesome Navy', 'Awesome Iceblue', 'Awesome Lilac', 'Awesome Lemon'], bestSeller: 0,
    description: 'Galaxy A55 memiliki bodi kokoh dengan rangka metal dan layar Super AMOLED yang nyaman untuk streaming. Kamera utama dengan OIS membantu mengurangi blur saat memotret atau merekam video.',
    specs: { display: '6.6 inci Super AMOLED, 120Hz', chip: 'Exynos 1480', camera: '50 MP utama OIS + 12 MP ultrawide + 5 MP macro', battery: '5000 mAh', network: '5G, Wi-Fi 6', fast_charge: '25W kabel' }
  },
  {
    brand: 'realme', name: 'realme GT 6', slug: 'realme-gt-6', price: 7999000, originalPrice: null,
    stock: 0, storage: '256 GB', colors: ['Fluid Silver', 'Razor Green', 'Storm Purple'], bestSeller: 0,
    description: 'realme GT 6 difokuskan untuk performa gaming berkat Snapdragon 8s Gen 3 dan sistem pendingin vapor chamber. Layar LTPO yang terang serta pengisian 120W melengkapi pengalaman flagship.',
    specs: { display: '6.78 inci LTPO AMOLED 1.5K, 120Hz', chip: 'Snapdragon 8s Gen 3', camera: '50 MP utama OIS + 50 MP telefoto 2x + 8 MP ultrawide', battery: '5500 mAh', network: '5G, Wi-Fi 6', fast_charge: '120W SUPERVOOC' }
  },
  {
    brand: 'Google', name: 'Pixel Buds Pro 2', slug: 'pixel-buds-pro-2', price: 3499000, originalPrice: null,
    stock: 16, storage: '—', colors: ['Porcelain', 'Hazel', 'Peony', 'Wintergreen'], bestSeller: 0,
    description: 'Pixel Buds Pro 2 menghadirkan active noise cancellation dan suara jernih dalam desain yang ringan. Integrasi Google Assistant memudahkan kontrol musik serta aktivitas tanpa perlu sering membuka ponsel.',
    specs: { audio: 'Active Noise Cancellation, spatial audio', chip: 'Google Tensor A1', connectivity: 'Bluetooth 5.4, multipoint', battery_life: 'Hingga 8 jam (ANC aktif), 30 jam dengan case', fast_charge: 'Pengisian cepat melalui USB-C dan wireless charging' }
  },
  {
    brand: 'Apple', name: 'AirPods Pro 2', slug: 'airpods-pro-2', price: 3999000, originalPrice: null,
    stock: 11, storage: '—', colors: ['White', 'Midnight Case', 'Lavender Case'], bestSeller: 0,
    description: 'AirPods Pro 2 menawarkan peredam bising aktif yang adaptif dan Transparency Mode untuk tetap menyadari lingkungan sekitar. Audio spasial personal serta integrasi perangkat Apple membuat pengalaman mendengarkan lebih praktis.',
    specs: { audio: 'Active Noise Cancellation, Adaptive Audio, Personalized Spatial Audio', chip: 'Apple H2', connectivity: 'Bluetooth 5.3, Apple ecosystem', battery_life: 'Hingga 6 jam (ANC aktif), 30 jam dengan case', fast_charge: 'MagSafe, USB-C, dan pengisian nirkabel Qi' }
  },
  {
    brand: 'Samsung', name: 'Galaxy Buds FE', slug: 'galaxy-buds-fe', price: 1499000, originalPrice: null,
    stock: 14, storage: '—', colors: ['Graphite', 'White', 'Lavender'], bestSeller: 0,
    description: 'Galaxy Buds FE memberikan active noise cancellation dan desain wingtip agar earbuds lebih stabil saat digunakan. Kontrol sentuh dan integrasi Galaxy memudahkan pemakaian untuk musik maupun panggilan.',
    specs: { audio: 'Active Noise Cancellation, ambient sound', connectivity: 'Bluetooth 5.2, Auto Switch', battery_life: 'Hingga 6 jam (ANC aktif), 21 jam dengan case', fast_charge: 'USB-C; pengisian 5 menit untuk pemakaian sekitar 1 jam' }
  }
];

const productInsert = db.prepare(`
  INSERT OR IGNORE INTO products(
    brand_id, category_id, name, slug, description, price, original_price, stock,
    storage, colors, specs, image_url, rating_avg, rating_count, is_best_seller
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

for (const product of products) {
  const accessory = product.storage === '—';
  productInsert.run(
    brandId(product.brand), accessory ? catAccessory : catPhone,
    product.name, product.slug, product.description, product.price, product.originalPrice,
    product.stock, product.storage, JSON.stringify(product.colors), JSON.stringify(product.specs),
    '/img/products/phone.svg', Number((4.1 + rand() * 0.8).toFixed(1)),
    Math.floor(35 + rand() * 420), product.bestSeller
  );
}

const adminHash = bcrypt.hashSync(config.adminPassword, 12);
db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES('TechNova Admin',?,?, 'admin') ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,role='admin'").run(config.adminEmail, adminHash);
const customerHash = bcrypt.hashSync('Customer123', 12);
const userInsert = db.prepare("INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,'customer')");
for (let i = 1; i <= 30; i++) userInsert.run(`Customer ${i}`, `customer${i}@example.test`, customerHash);

const users = db.prepare("SELECT id FROM users WHERE role='customer' ORDER BY id").all();
const activeProducts = db.prepare('SELECT * FROM products WHERE is_active=1').all();
const orderInsert = db.prepare(`
  INSERT INTO orders(order_number,user_id,status,subtotal,shipping_fee,total,ship_name,ship_address,ship_city,ship_postal_code,ship_phone,payment_method,payment_status,estimated_delivery,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
const itemInsert = db.prepare('INSERT INTO order_items(order_id,product_id,product_name,unit_price,color,qty,created_at) VALUES(?,?,?,?,?,?,?)');
const trackingInsert = db.prepare('INSERT INTO order_tracking(order_id,status,note,created_at) VALUES(?,?,?,?)');
const statuses = ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const methods = ['card', 'paypal', 'apple_pay', 'cod'];
const now = Date.now();
const makeDate = days => new Date(now - days * 86400000);
const stamp = date => date.toISOString().slice(0, 19).replace('T', ' ');
const transitions = ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

const seedOrders = db.transaction(() => {
  for (let i = 0; i < 300; i++) {
    const days = Math.floor(Math.pow(rand(), 1.25) * 90);
    const date = makeDate(days);
    const user = pick(users);
    const status = pick(statuses);
    const method = pick(methods);
    const count = 1 + Math.floor(rand() * 3);
    let subtotal = 0;
    const chosen = [];

    for (let j = 0; j < count; j++) {
      const product = pick(activeProducts);
      const qty = 1 + Math.floor(rand() * 2);
      chosen.push({ product, qty });
      subtotal += product.price * qty;
    }

    const shipping = subtotal >= 1500000 ? 0 : 25000;
    const number = `TN${String(100000 + Math.floor(rand() * 900000)).padStart(6, '0')}${String(i).padStart(3, '0')}`;
    const createdAt = stamp(date);
    const eta = stamp(new Date(date.getTime() + 5 * 86400000)).slice(0, 10);
    const result = orderInsert.run(
      number, user.id, status, subtotal, shipping, subtotal + shipping,
      `Customer ${user.id}`, 'Jl. Contoh No. 10', 'Jakarta', '10110', '081234567890',
      method, method === 'cod' ? 'pending' : 'paid', eta, createdAt
    );

    for (const { product, qty } of chosen) {
      itemInsert.run(result.lastInsertRowid, product.id, product.name, product.price,
        pick(JSON.parse(product.colors)), qty, createdAt);
    }

    const statusIndex = status === 'cancelled' ? 0 : transitions.indexOf(status);
    const timeline = status === 'cancelled' ? ['placed', 'cancelled'] : transitions.slice(0, statusIndex + 1);
    timeline.forEach((value, index) => trackingInsert.run(
      result.lastInsertRowid, value, `Status pesanan: ${value}`,
      stamp(new Date(date.getTime() + index * 3600000))
    ));
  }
});
seedOrders();

const wishlistInsert = db.prepare('INSERT OR IGNORE INTO wishlists(user_id,product_id) VALUES(?,?)');
for (let i = 0; i < 45; i++) wishlistInsert.run(pick(users).id, pick(activeProducts).id);

const chatInsert = db.prepare('INSERT INTO chat_logs(user_id,session_id,user_message,bot_reply,recommended_product_ids,latency_ms,is_error,created_at) VALUES(?,?,?,?,?,?,?,?)');
for (let i = 0; i < 60; i++) {
  const product = pick(activeProducts);
  chatInsert.run(
    pick(users).id, `seed-session-${i}`,
    pick(['Cari HP kamera bagus', 'Ada rekomendasi untuk gaming?', 'HP budget 5 juta', 'Bandingkan baterai dan harga']),
    `Rekomendasi: ${product.name}`, JSON.stringify([product.id]),
    Math.floor(500 + rand() * 2400), rand() < 0.03 ? 1 : 0,
    stamp(makeDate(Math.floor(rand() * 90)))
  );
}

const newsletterInsert = db.prepare('INSERT OR IGNORE INTO newsletter_subscribers(email) VALUES(?)');
for (let i = 1; i <= 12; i++) newsletterInsert.run(`subscriber${i}@example.test`);

console.log(`Seed selesai: ${db.prepare('SELECT COUNT(*) n FROM products').get().n} produk, ${db.prepare('SELECT COUNT(*) n FROM orders').get().n} order.`);
console.log(`Admin: ${config.adminEmail} / password dari ADMIN_PASSWORD; customer: customer1@example.test / Customer123`);