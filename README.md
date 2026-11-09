# TechNova Backend

Versi 1.0.0 · Penulis: Prasetyo Aji

Backend e-commerce smartphone TechNova menggunakan Node.js ESM, Express 5, SQLite, dan Gemini API. Frontend disediakan pada ZIP terpisah.

## Fitur
- Register, login, logout, sesi cookie HttpOnly.
- Katalog, pencarian, filter, detail, keranjang, wishlist.
- Checkout simulasi, riwayat dan tracking pesanan.
- Asisten AI berbasis katalog SQLite.
- Admin: statistik, CRUD produk (soft delete/pulihkan), pengelolaan status pesanan.
- Analisis SQL dan tes otomatis.

## Cara menjalankan
1. Gunakan Node.js 18+ dan salin `.env.example` menjadi `.env`.
2. Isi `JWT_SECRET` dengan string acak minimal 32 karakter. Isi kredensial admin dan `GEMINI_API_KEY`.
3. Jalankan `npm install`.
4. Jalankan `npm run seed`.
5. Jalankan `npm start`, lalu buka `http://localhost:3000`.

## Akun demo
- Admin: gunakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env` (default email `admin@technova.test`, password seed `Admin12345` bila env password kosong).
- Customer: `customer1@technova.test` sampai `customer30@technova.test`, password `Customer123`.

## Environment
`PORT`, `NODE_ENV`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Script
- `npm start`: server.
- `npm run dev`: server watch.
- `npm run seed`: data contoh deterministik; tidak menghapus data yang sudah ada.
- `npm run analyze`: hasil analisis di `docs/analisis/hasil_query.md`.
- `npm test`: tes bawaan `node:test`.

## Keamanan
bcrypt cost 12; JWT 2 jam di cookie HttpOnly/SameSite Strict; pemeriksaan Origin untuk request tulis; validasi Zod; prepared statements; helmet/CSP; rate limit; otorisasi admin dan kepemilikan cart/order. Data pembayaran kartu tidak disimpan. Kunci Gemini hanya di server.

## Migrasi
Ganti `index.js`, `package.json`, `.env.example`, `.gitignore`, dan `README.md` proyek lama. Hapus `public/index.html`, `public/script.js`, `public/style.css`, dan `public/MBG-logo.png` lama. Hapus middleware `app.use(cors())` terbuka. Folder `public/` pada ZIP frontend akan menggantikan UI chatbot lama. Database lama tidak digunakan; SQLite dibuat di `data/technova.db`.

## Asumsi
- Antarmuka berbahasa Indonesia; seluruh harga dalam Rupiah.
- Produk, pelanggan, dan transaksi seed adalah data fiktif.
- Pembayaran card/PayPal/Apple Pay merupakan simulasi; tidak ada data kartu dikirim atau disimpan.
- Ongkir Rp25.000 dan gratis untuk subtotal minimal Rp1.000.000.
- Estimasi pengiriman lima hari sejak checkout.
- Database lokal SQLite; file database tidak masuk ZIP.
- Email admin dan password admin berasal dari environment.
- Status order dapat diperbarui admin ke status yang disediakan API.

## Batasan dan verifikasi
- ZIP ini tidak menyertakan frontend; halaman HTML disediakan pada ZIP frontend.
- Endpoint CRUD brand/kategori P2 tidak termasuk cakupan ZIP backend saat ini.
- Seed membuat 300 order sintetis jika tabel order masih kosong.
- `npm install`, `npm test`, `npm run seed`, `npm run analyze`, dan `npm audit` belum dijalankan. Kompatibilitas native `better-sqlite3` perlu diverifikasi pada mesin target.
