// TODO: Implement gamification routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Gamification routes not yet implemented' });
});

export { router as gamificationRoutes };
