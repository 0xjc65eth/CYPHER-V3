// TODO: Implement derivatives trading routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Derivatives routes not yet implemented' });
});

export { router as derivativesRoutes };
