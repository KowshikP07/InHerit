import cron from 'node-cron';
import { pool } from '../config/db.js';
import { io } from '../server.js';

let isRunning = false;

export async function finalizeExpiredAuctions() {
  if (isRunning) return;
  isRunning = true;

  const client = await pool.connect();

  try {
    // 1. Fetch expired open auctions using FOR UPDATE SKIP LOCKED to prevent duplicate multi-instance finalization
    await client.query('BEGIN');

    const expiredRes = await client.query(
      `SELECT id, seller_id, title, end_time
       FROM auctions
       WHERE status = 'OPEN' AND end_time <= CURRENT_TIMESTAMP
       FOR UPDATE SKIP LOCKED;`
    );

    if (expiredRes.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    console.log(`⏰ Scheduler: Found ${expiredRes.rows.length} expired auction(s) to finalize.`);

    for (const auction of expiredRes.rows) {
      // 2. Find highest valid accepted bid
      const highestBidRes = await client.query(
        `SELECT b.id, b.bidder_id, b.amount, u.name AS bidder_name, u.email AS bidder_email
         FROM bids b
         JOIN users u ON b.bidder_id = u.id
         WHERE b.auction_id = $1
         ORDER BY b.amount DESC, b.created_at ASC
         LIMIT 1;`,
        [auction.id]
      );

      if (highestBidRes.rows.length === 0) {
        // No bids placed -> mark UNSOLD
        await client.query(
          `UPDATE auctions
           SET status = 'UNSOLD',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1;`,
          [auction.id]
        );

        console.log(`🏷️ Auction ${auction.id} ("${auction.title}") closed: UNSOLD (0 bids).`);

        if (io) {
          io.to(`auction:${auction.id}`).emit('auction_closed', {
            auctionId: auction.id,
            status: 'UNSOLD',
            message: 'Auction ended with no bids placed.'
          });
        }
      } else {
        const winningBid = highestBidRes.rows[0];

        // 3. Close auction and register sale record for winner
        await client.query(
          `UPDATE auctions
           SET status = 'CLOSED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1;`,
          [auction.id]
        );

        await client.query(
          `INSERT INTO sales (
            auction_id, winning_bidder_id, final_price, seller_decision, handover_status
          ) VALUES ($1, $2, $3, 'PENDING', 'PENDING')
          ON CONFLICT (auction_id) DO NOTHING;`,
          [auction.id, winningBid.bidder_id, winningBid.amount]
        );

        console.log(`🏆 Auction ${auction.id} ("${auction.title}") won by ${winningBid.bidder_name} for ₹${winningBid.amount}.`);

        if (io) {
          io.to(`auction:${auction.id}`).emit('auction_closed', {
            auctionId: auction.id,
            status: 'CLOSED',
            winnerName: winningBid.bidder_name,
            finalPrice: parseFloat(winningBid.amount),
            message: `Auction ended. Winning bid: ₹${winningBid.amount} by ${winningBid.bidder_name}.`
          });

          // Private notification to the winner
          io.to(`user:${winningBid.bidder_id}`).emit('auction_won', {
            auctionId: auction.id,
            auctionTitle: auction.title,
            finalPrice: parseFloat(winningBid.amount)
          });
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Auction finalization scheduler error:', error);
  } finally {
    client.release();
    isRunning = false;
  }
}

export function initAuctionScheduler() {
  console.log('⏱️ Initializing auction closure scheduler (runs every 30 seconds)...');
  
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await finalizeExpiredAuctions();
    } catch (err) {
      console.error('Scheduler cron tick error:', err);
    }
  });

  // Run once immediately on startup
  setTimeout(finalizeExpiredAuctions, 2000);
}

