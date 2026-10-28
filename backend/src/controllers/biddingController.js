import { pool } from '../config/db.js';
import { io } from '../server.js';

export const placeBid = async (req, res) => {
  const { id: auctionId } = req.params;
  const { amount } = req.body;
  const bidderId = req.user.id; // Extracted strictly from verified JWT

  const bidAmount = parseFloat(amount);

  if (isNaN(bidAmount) || bidAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Bid amount must be a positive numeric value.'
    });
  }

  // Check out a single dedicated PostgreSQL client for the entire atomic transaction
  const client = await pool.connect();

  try {
    // 1. Begin atomic transaction
    await client.query('BEGIN');

    // 2. Lock the specific auction row with SELECT ... FOR UPDATE
    // This serializes all simultaneous bids for this auction without blocking other auctions
    const auctionRes = await client.query(
      `SELECT id, seller_id, title, starting_price, min_increment, end_time, status,
              CURRENT_TIMESTAMP AS db_now
       FROM auctions
       WHERE id = $1
       FOR UPDATE;`,
      [auctionId]
    );

    if (auctionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Auction listing not found.'
      });
    }

    const auction = auctionRes.rows[0];

    // 3. Recheck auction status and server/database time after acquiring row lock
    const dbNow = new Date(auction.db_now);
    const auctionEnd = new Date(auction.end_time);

    if (auction.status !== 'OPEN') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Auction is not open for bidding (Current status: ${auction.status}).`
      });
    }

    if (dbNow.getTime() >= auctionEnd.getTime()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This auction has expired and is no longer accepting bids.'
      });
    }

    // 4. Reject bids from the auction's seller (anti-self-bidding rule)
    if (auction.seller_id === bidderId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Sellers are strictly prohibited from bidding on their own listings.'
      });
    }

    // 5. Query current highest accepted bid within the same locked transaction
    const highestBidRes = await client.query(
      `SELECT id, bidder_id, amount
       FROM bids
       WHERE auction_id = $1
       ORDER BY amount DESC, created_at ASC
       LIMIT 1;`,
      [auctionId]
    );

    const startingPrice = parseFloat(auction.starting_price);
    const minIncrement = parseFloat(auction.min_increment);
    let previousHighestBidder = null;

    if (highestBidRes.rows.length === 0) {
      // 6. First bid rule: must be at least the starting price
      if (bidAmount < startingPrice) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Your starting bid must be at least ₹${startingPrice.toFixed(2)}.`
        });
      }
    } else {
      const currentHighestBid = parseFloat(highestBidRes.rows[0].amount);
      previousHighestBidder = highestBidRes.rows[0].bidder_id;

      // Anti-consecutive self outbidding warning / check
      if (previousHighestBidder === bidderId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'You currently hold the highest bid on this auction.'
        });
      }

      // 7. Subsequent bid rule: must be at least current highest + minimum increment
      const minRequiredBid = currentHighestBid + minIncrement;
      if (bidAmount < minRequiredBid) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Bid too low. The minimum required bid is ₹${minRequiredBid.toFixed(2)} (Current bid: ₹${currentHighestBid.toFixed(2)} + Increment: ₹${minIncrement.toFixed(2)}).`
        });
      }
    }

    // 8. Insert the new accepted bid atomically
    const insertBidRes = await client.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, auction_id, bidder_id, amount, created_at;`,
      [auctionId, bidderId, bidAmount]
    );

    const newBid = insertBidRes.rows[0];

    // Total bids count query
    const totalBidsRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM bids WHERE auction_id = $1;`,
      [auctionId]
    );
    const totalBids = totalBidsRes.rows[0].count;

    // 9. Commit transaction on success
    await client.query('COMMIT');

    // 10. REAL-TIME BROADCAST VIA SOCKET.IO (Only AFTER successful commit!)
    const payload = {
      auctionId,
      bidId: newBid.id,
      amount: parseFloat(newBid.amount),
      bidderName: req.user.name,
      bidderRoll: req.user.roll_number,
      timestamp: newBid.created_at,
      currentHighestBid: parseFloat(newBid.amount),
      totalBids
    };

    if (io) {
      // Broadcast to room of connected auction observers
      io.to(`auction:${auctionId}`).emit('accepted_bid', payload);

      // Notify previous highest bidder that they have been outbid
      if (previousHighestBidder && previousHighestBidder !== bidderId) {
        io.to(`user:${previousHighestBidder}`).emit('outbid', {
          auctionId,
          auctionTitle: auction.title,
          newHighestBid: parseFloat(newBid.amount),
          timestamp: newBid.created_at
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Your bid of ₹${bidAmount.toFixed(2)} was placed successfully.`,
      bid: payload
    });

  } catch (error) {
    // Rollback on any failure
    try {
      await client.query('ROLLBACK');
    } catch (rbError) {
      console.error('Rollback error:', rbError);
    }
    console.error('Secure bid transaction error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bid due to a database transaction error. Please try again.'
    });
  } finally {
    // Always return client to connection pool
    client.release();
  }
};

export const getAuctionBids = async (req, res) => {
  try {
    const { id: auctionId } = req.params;

    const result = await query(
      `SELECT 
        b.id,
        b.auction_id AS "auctionId",
        b.amount,
        b.created_at AS "createdAt",
        u.name AS "bidderName",
        u.roll_number AS "bidderRoll"
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = $1
       ORDER BY b.amount DESC, b.created_at DESC;`,
      [auctionId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      bids: result.rows
    });
  } catch (error) {
    console.error('Fetch bids error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bid history.'
    });
  }
};

