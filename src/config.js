import 'dotenv/config';

const secret = process.env.JWT_SECRET || '';
if (secret.length < 32) {
  throw new Error('JWT_SECRET wajib diisi dan minimal 32 karakter.');
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: secret,
  jwtExpiresIn: '2h',
  cookieName: 'technova_session',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@technova.test',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  shippingFee: 25000,
  freeShippingThreshold: 1000000,
  maxQty: 10,
  rateLimit: Object.freeze({
    windowMs: 15 * 60 * 1000,
    globalLimit: 300,
    globalLimitDevelopment: 3000,
    authLimit: 10,
    chatWindowMs: 60 * 1000,
    chatLimit: 20
  })
});
