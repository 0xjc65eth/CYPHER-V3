// TODO: Implement payment gateway routes
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Payment routes not yet implemented' });
});

export { router as paymentRoutes };
