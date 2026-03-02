// TODO: Implement cross-chain bridge routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Bridge routes not yet implemented' });
});

export { router as bridgeRoutes };
