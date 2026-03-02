// TODO: Implement liquidation protection routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Protection routes not yet implemented' });
});

export { router as protectionRoutes };
