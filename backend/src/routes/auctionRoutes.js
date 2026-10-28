import { Router } from 'express';
import {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  cancelAuction,
  getMyAuctions
} from '../controllers/auctionController.js';
import { placeBid, getAuctionBids } from '../controllers/biddingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadImages } from '../middleware/upload.js';
import { bidLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public / Authenticated Browse
router.get('/', getAuctions);

// User listings (Must be placed before /:id)
router.get('/my/listings', authenticateToken, getMyAuctions);

// Listing details
router.get('/:id', getAuctionById);

// Create Listing (Multer handles image uploads)
router.post('/', authenticateToken, uploadImages.array('images', 5), createAuction);

// Edit Listing
router.patch('/:id', authenticateToken, updateAuction);

// Cancel Listing
router.delete('/:id', authenticateToken, cancelAuction);

// Bidding Endpoints
router.post('/:id/bids', authenticateToken, bidLimiter, placeBid);
router.get('/:id/bids', getAuctionBids);

export default router;

