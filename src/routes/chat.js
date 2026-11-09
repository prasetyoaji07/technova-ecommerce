import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rate-limit.js';
import { askAssistant } from '../services/chat.service.js';
import { success } from '../utils/response.js';

const router = Router();
const schema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.string(), content: z.string().max(1000) })).max(10).default([]),
  context: z.object({ page: z.string().max(100).optional(), productSlug: z.string().max(160).optional() }).default({})
}).strict();
router.post('/', chatLimiter, optionalAuth, validate(schema), async (req, res) => {
  const sessionId = req.get('x-chat-session')?.slice(0, 100) || randomUUID();
  const data = await askAssistant({ ...req.body, userId: req.user?.id || null, sessionId });
  success(res, data);
});
export default router;
