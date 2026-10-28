import { query } from '../config/db.js';
import { io } from '../server.js';

export const getSaleDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const result = await query(
      `SELECT 
        s.id,
        s.auction_id AS "auctionId",
        s.winning_bidder_id AS "winnerId",
        s.final_price AS "finalPrice",
        s.seller_decision AS "sellerDecision",
        s.handover_status AS "handoverStatus",
        s.decided_at AS "decidedAt",
        s.completed_at AS "completedAt",
        a.title AS "auctionTitle",
        a.seller_id AS "sellerId",
        seller.name AS "sellerName",
        seller.email AS "sellerEmail",
        winner.name AS "winnerName",
        winner.email AS "winnerEmail"
       FROM sales s
       JOIN auctions a ON s.auction_id = a.id
       JOIN users seller ON a.seller_id = seller.id
       LEFT JOIN users winner ON s.winning_bidder_id = winner.id
       WHERE s.auction_id = $1;`,
      [auctionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sale record found for this auction.'
      });
    }

    return res.json({
      success: true,
      sale: result.rows[0]
    });
  } catch (error) {
    console.error('Fetch sale details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sale details.'
    });
  }
};

export const sellerDecision = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { decision } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be either APPROVED or REJECTED.'
      });
    }

    // Verify auction and seller ownership
    const auctionRes = await query(
      'SELECT seller_id, title FROM auctions WHERE id = $1',
      [auctionId]
    );

    if (auctionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auctionRes.rows[0].seller_id !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the seller can accept or reject the proposed price.' });
    }

    const saleRes = await query(
      `UPDATE sales
       SET seller_decision = $1,
           handover_status = CASE WHEN $1 = 'REJECTED' THEN 'CANCELLED' ELSE handover_status END,
           decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE auction_id = $2
       RETURNING *;`,
      [decision, auctionId]
    );

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No pending sale record found.' });
    }

    const updatedSale = saleRes.rows[0];

    // Real-time notification
    if (io) {
      io.to(`auction:${auctionId}`).emit('sale_decision', {
        auctionId,
        decision,
        message: `Seller has ${decision.toLowerCase()} the winning offer.`
      });

      if (updatedSale.winning_bidder_id) {
        io.to(`user:${updatedSale.winning_bidder_id}`).emit('seller_decision', {
          auctionId,
          auctionTitle: auctionRes.rows[0].title,
          decision
        });
      }
    }

    return res.json({
      success: true,
      message: `Sale proposal ${decision.toLowerCase()} successfully.`,
      sale: updatedSale
    });
  } catch (error) {
    console.error('Seller decision error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record seller decision.'
    });
  }
};

export const updateHandover = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { status } = req.body; // 'CONFIRMED', 'CANCELLED', 'FAILED_PICKUP'

    if (!['CONFIRMED', 'CANCELLED', 'FAILED_PICKUP'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Handover status must be CONFIRMED, CANCELLED, or FAILED_PICKUP.'
      });
    }

    const saleRes = await query(
      `SELECT s.*, a.seller_id
       FROM sales s
       JOIN auctions a ON s.auction_id = a.id
       WHERE s.auction_id = $1;`,
      [auctionId]
    );

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale record not found.' });
    }

    const sale = saleRes.rows[0];

    // Ensure only seller, winner, or super admin can update handover
    const isParty = req.user.id === sale.seller_id || req.user.id === sale.winning_bidder_id || req.user.role === 'SUPER_ADMIN';
    if (!isParty) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this handover.' });
    }

    const completedAt = status === 'CONFIRMED' ? new Date().toISOString() : null;

    const updatedRes = await query(
      `UPDATE sales
       SET handover_status = $1,
           completed_at = COALESCE($2, completed_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE auction_id = $3
       RETURNING *;`,
      [status, completedAt, auctionId]
    );

    // If confirmed, update auction status to SOLD
    if (status === 'CONFIRMED') {
      await query(
        `UPDATE auctions SET status = 'SOLD', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [auctionId]
      );
    }

    if (io) {
      io.to(`auction:${auctionId}`).emit('handover_updated', {
        auctionId,
        handoverStatus: status
      });
    }

    return res.json({
      success: true,
      message: `Handover status updated to ${status}.`,
      sale: updatedRes.rows[0]
    });
  } catch (error) {
    console.error('Update handover error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update handover status.'
    });
  }
};

