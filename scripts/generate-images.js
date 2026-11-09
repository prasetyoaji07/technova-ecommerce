import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = path.join(root, 'data', 'technova.db');
const outputDir = path.join(root, 'public', 'img', 'products');
const accents = {
  Apple: '#6B7C98', Samsung: '#315BCB', Google: '#32856F',
  OnePlus: '#C7463A', Xiaomi: '#D97724', realme: '#B5A12A'
};

if (!fs.existsSync(databasePath)) {
  throw new Error(`Database tidak ditemukan: ${databasePath}. Jalankan seed terlebih dahulu.`);
}

const db = new Database(databasePath, { readonly: true });
const products = db.prepare(`SELECT p.slug, p.name, b.name AS brand
  FROM products p JOIN brands b ON b.id = p.brand_id
  ORDER BY p.id`).all();
db.close();
fs.mkdirSync(outputDir, { recursive: true });

for (const product of products) {
  const accent = accents[product.brand] || '#315BCB';
  const title = escapeXml(product.name);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 440" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title><desc id="desc">Ilustrasi perangkat ${title}</desc>
  <defs><linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="#0A1B4D"/></linearGradient></defs>
  <ellipse cx="180" cy="405" rx="105" ry="13" fill="#0A1B4D" opacity=".09"/>
  <rect x="86" y="22" width="188" height="380" rx="34" fill="#18233D"/>
  <rect x="94" y="30" width="172" height="364" rx="28" fill="#F8FAFF"/>
  <rect x="101" y="39" width="158" height="346" rx="22" fill="url(#screen)"/>
  <path d="M101 252c38-58 67-15 93-63 22-39 40-41 65-63v259H101Z" fill="#FFFFFF" opacity=".16"/>
  <path d="M101 292c40-30 70-13 97-49 21-27 38-23 61-43v185H101Z" fill="#FFFFFF" opacity=".12"/>
  <rect x="148" y="44" width="64" height="9" rx="5" fill="#17233F"/>
  <circle cx="119" cy="77" r="10" fill="#17233F"/><circle cx="119" cy="77" r="5" fill="${accent}"/>
  <circle cx="143" cy="77" r="10" fill="#17233F"/><circle cx="143" cy="77" r="5" fill="${accent}"/>
  <circle cx="131" cy="101" r="10" fill="#17233F"/><circle cx="131" cy="101" r="5" fill="${accent}"/>
  <path d="M130 322h100" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity=".8"/>
  <path d="M150 341h60" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".45"/>
  <rect x="162" y="389" width="36" height="3" rx="2" fill="#B9C6E1"/>
</svg>`;
  const filename = `${safeSlug(product.slug)}.svg`;
  fs.writeFileSync(path.join(outputDir, filename), svg, 'utf8');
}

console.info(`${products.length} ilustrasi produk dibuat di public/img/products.`);

function safeSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}
