import { Router } from 'express';
import { db } from '../db/connection.js';
import { success } from '../utils/response.js';

const router = Router();
router.get('/brands', (req, res) => success(res, db.prepare('SELECT id,name,slug FROM brands ORDER BY name').all()));
router.get('/categories', (req, res) => success(res, db.prepare('SELECT id,name,slug FROM categories ORDER BY name').all()));
export default router;
