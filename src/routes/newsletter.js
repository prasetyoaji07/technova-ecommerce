import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

const router = Router();
router.post('/', validate(z.object({ email: z.string().email().max(180) }).strict()), (req, res) => {
  db.prepare('INSERT OR IGNORE INTO newsletter_subscribers(email) VALUES(?)').run(req.body.email.toLowerCase());
  success(res, { subscribed: true }, 201);
});
export default router;
