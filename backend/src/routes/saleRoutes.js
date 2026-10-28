import { Router } from 'express';
import {
  getSaleDetails,
  sellerDecision,
  updateHandover
} from '../controllers/salesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/:auctionId', getSaleDetails);
router.patch('/:auctionId/decision', authenticateToken, sellerDecision);
router.patch('/:auctionId/handover', authenticateToken, updateHandover);

export default router;

