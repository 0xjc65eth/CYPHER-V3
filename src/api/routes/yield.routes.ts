// TODO: Implement yield farming routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Yield routes not yet implemented' });
});

export { router as yieldRoutes };
