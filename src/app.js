import express from 'express';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase, db } from './db/connection.js';
import { config } from './config.js';
import { globalLimiter, authLimiter } from './middleware/rate-limit.js';
import { csrfProtection } from './middleware/csrf.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import orderRoutes from './routes/orders.js';
import newsletterRoutes from './routes/newsletter.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import { success } from './utils/response.js';

initializeDatabase();
const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'https:', 'data:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"]
} } }));
app.use('/api/admin/upload', express.json({ limit: '3.5mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(globalLimiter);
app.use(csrfProtection);

app.get('/api/health', (req, res) => success(res, { status: 'ok' }));
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.get('/admin', (req, res) => {
  try {
    const payload = jwt.verify(req.cookies?.[config.cookieName] || '', config.jwtSecret);
    const user = db.prepare('SELECT role FROM users WHERE id=?').get(payload.sub);
    if (user?.role === 'admin') return res.sendFile(path.resolve(here, '../public/admin.html'));
  } catch {}
  return res.redirect('/login.html');
});
app.use(express.static(path.resolve(here, '../public')));
app.use(notFound);
app.use(errorHandler);
export { app };
