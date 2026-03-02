// TODO: Implement news and sentiment routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'News routes not yet implemented' });
});

export { router as newsRoutes };
