import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { config } from '../config.js';
import { AppError } from '../utils/app-error.js';

export async function register({ name, email, password }) {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) throw new AppError(409, 'EMAIL_EXISTS', 'Email sudah terdaftar.');
  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
    .run(name, email.toLowerCase(), hash, 'customer');
  return db.prepare('SELECT id,name,email,role FROM users WHERE id = ?').get(result.lastInsertRowid);
}
export async function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
