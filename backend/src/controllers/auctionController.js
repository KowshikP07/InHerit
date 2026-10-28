import { pool, query } from '../config/db.js';

export const createAuction = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title,
      description,
      category,
      condition,
      starting_price,
      startingPrice,
      min_increment,
      minIncrement,
      end_time,
      endTime,
      imagePaths
    } = req.body;

    const startPrice = parseFloat(starting_price || startingPrice);
    const increment = parseFloat(min_increment || minIncrement || 50);
    const closeTime = new Date(end_time || endTime);

    // 1. Validation
    if (!title || !description || !category || !condition || isNaN(startPrice) || isNaN(closeTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'All fields (title, description, category, condition, starting price, end time) are required.'
      });
    }

    if (startPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Starting price must be greater than zero.'
      });
    }

    if (increment <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum increment must be greater than zero.'
      });
    }

    if (closeTime.getTime() <= Date.now() + 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'Auction close time must be set in the future (minimum 1 minute).'
      });
    }

    await client.query('BEGIN');

    // 2. Insert auction listing
    const auctionRes = await client.query(
      `INSERT INTO auctions (
        seller_id, title, description, category, condition, starting_price, min_increment, end_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
      RETURNING *;`,
      [req.user.id, title.trim(), description.trim(), category.trim(), condition.trim(), startPrice, increment, closeTime]
    );

    const auction = auctionRes.rows[0];

    // 3. Attach uploaded files or provided image paths
    const imagesToInsert = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        const relativePath = `/uploads/${file.filename}`;
        imagesToInsert.push({ path: relativePath, order: index, isPrimary: index === 0 });
      });
    } else if (Array.isArray(imagePaths) && imagePaths.length > 0) {
      imagePaths.forEach((imgPath, index) => {
        imagesToInsert.push({ path: imgPath, order: index, isPrimary: index === 0 });
      });
    }

    for (const img of imagesToInsert) {
      await client.query(
        `INSERT INTO auction_images (auction_id, image_path, display_order, is_primary)
         VALUES ($1, $2, $3, $4);`,
        [auction.id, img.path, img.order, img.isPrimary]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Auction listing published successfully.',
      auction: {
        ...auction,
        images: imagesToInsert.map(i => i.path)
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create auction error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create auction listing.'
    });
  } finally {
    client.release();
  }
};

export const getAuctions = async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      status = 'OPEN',
      minPrice,
      maxPrice,
      sort = 'newest'
    } = req.query;

    const conditions = [];
    const params = [];

    // Filter by status (unless 'all' requested)
    if (status !== 'all') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    // Keyword search in title and description
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
    }

    // Category filter
    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`a.category = $${params.length}`);
    }

    // Condition filter
    if (condition && condition !== 'All') {
      params.push(condition);
      conditions.push(`a.condition = $${params.length}`);
    }

    // Price range filters
    if (minPrice && !isNaN(parseFloat(minPrice))) {
      params.push(parseFloat(minPrice));
      conditions.push(`a.starting_price >= $${params.length}`);
    }
    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      params.push(parseFloat(maxPrice));
      conditions.push(`a.starting_price <= $${params.length}`);
    }

    // Sort order
    let orderByClause = 'ORDER BY a.created_at DESC';
    if (sort === 'closing') {
      orderByClause = 'ORDER BY a.end_time ASC';
    } else if (sort === 'low') {
      orderByClause = 'ORDER BY COALESCE(highest_bid.amount, a.starting_price) ASC';
    } else if (sort === 'high') {
      orderByClause = 'ORDER BY COALESCE(highest_bid.amount, a.starting_price) DESC';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        a.id,
        a.seller_id AS "sellerId",
        u.name AS "sellerName",
        a.title,
        a.description,
        a.category,
        a.condition,
        a.starting_price AS "startingPrice",
        a.min_increment AS "minIncrement",
        a.end_time AS "endTime",
        a.status,
        a.created_at AS "createdAt",
        COALESCE(highest_bid.amount, a.starting_price) AS "currentBid",
        COALESCE(bid_stats.total_bids, 0)::int AS "bidCount",
        COALESCE(
          json_agg(
            json_build_object('id', img.id, 'imagePath', img.image_path, 'isPrimary', img.is_primary)
            ORDER BY img.display_order ASC
          ) FILTER (WHERE img.id IS NOT NULL), '[]'
        ) AS images
      FROM auctions a
      JOIN users u ON a.seller_id = u.id
      LEFT JOIN (
        SELECT auction_id, MAX(amount) AS amount
        FROM bids
        GROUP BY auction_id
      ) highest_bid ON highest_bid.auction_id = a.id
      LEFT JOIN (
        SELECT auction_id, COUNT(*) AS total_bids
        FROM bids
        GROUP BY auction_id
      ) bid_stats ON bid_stats.auction_id = a.id
      LEFT JOIN auction_images img ON img.auction_id = a.id
      ${whereClause}
      GROUP BY a.id, u.name, highest_bid.amount, bid_stats.total_bids
      ${orderByClause};
    `;

    const result = await query(sql, params);

    return res.json({
      success: true,
      count: result.rows.length,
      auctions: result.rows.map(row => ({
        ...row,
        imageIds: row.images.map(img => img.imagePath)
      }))
    });
  } catch (error) {
    console.error('Fetch auctions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve auction listings.'
    });
  }
};

export const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch auction details with seller information
    const auctionRes = await query(
      `SELECT 
        a.id,
        a.seller_id AS "sellerId",
        u.name AS "sellerName",
        u.email AS "sellerEmail",
        u.roll_number AS "sellerRoll",
        a.title,
        a.description,
        a.category,
        a.condition,
        a.starting_price AS "startingPrice",
        a.min_increment AS "minIncrement",
        a.end_time AS "endTime",
        a.status,
        a.created_at AS "createdAt"
       FROM auctions a
       JOIN users u ON a.seller_id = u.id
       WHERE a.id = $1;`,
      [id]
    );

    if (auctionRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auction listing not found.'
      });
    }

    const auction = auctionRes.rows[0];

    // Fetch images
    const imagesRes = await query(
      `SELECT id, image_path AS "imagePath", is_primary AS "isPrimary"
       FROM auction_images
       WHERE auction_id = $1
       ORDER BY display_order ASC;`,
      [id]
    );

    // Fetch public bid history
    const bidsRes = await query(
      `SELECT 
        b.id,
        b.amount,
        b.created_at AS "createdAt",
        u.name AS "bidderName",
        u.roll_number AS "bidderRoll"
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = $1
       ORDER BY b.amount DESC, b.created_at DESC;`,
      [id]
    );

    const highestBid = bidsRes.rows.length > 0 ? bidsRes.rows[0].amount : auction.startingPrice;

    // Fetch sale record if any
    const saleRes = await query(
      `SELECT 
        s.id,
        s.final_price AS "finalPrice",
        s.seller_decision AS "sellerDecision",
        s.handover_status AS "handoverStatus",
        s.decided_at AS "decidedAt",
        s.completed_at AS "completedAt",
        u.name AS "winnerName"
       FROM sales s
       LEFT JOIN users u ON s.winning_bidder_id = u.id
       WHERE s.auction_id = $1;`,
      [id]
    );

    return res.json({
      success: true,
      auction: {
        ...auction,
        currentBid: highestBid,
        bidCount: bidsRes.rows.length,
        images: imagesRes.rows.map(img => img.imagePath),
        imageIds: imagesRes.rows.map(img => img.imagePath),
        bids: bidsRes.rows,
        sale: saleRes.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Fetch auction by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve auction details.'
    });
  }
};

export const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, condition } = req.body;

    const auctionRes = await query('SELECT * FROM auctions WHERE id = $1', [id]);
    if (auctionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction listing not found.' });
    }

    const auction = auctionRes.rows[0];

    // Enforce ownership
    if (auction.seller_id !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only edit your own listings.' });
    }

    if (auction.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Only open auctions can be modified.' });
    }

    const updated = await query(
      `UPDATE auctions
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           condition = COALESCE($4, condition),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *;`,
      [title?.trim() || null, description?.trim() || null, category?.trim() || null, condition?.trim() || null, id]
    );

    return res.json({
      success: true,
      message: 'Auction details updated.',
      auction: updated.rows[0]
    });
  } catch (error) {
    console.error('Update auction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update auction.' });
  }
};

export const cancelAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const auctionRes = await query('SELECT * FROM auctions WHERE id = $1', [id]);
    if (auctionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction listing not found.' });
    }

    const auction = auctionRes.rows[0];

    // Enforce ownership
    if (auction.seller_id !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only cancel your own listings.' });
    }

    if (auction.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This auction is already cancelled.' });
    }

    // Mark as CANCELLED (Preserving bid history in database!)
    await query(
      `UPDATE auctions
       SET status = 'CANCELLED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [id]
    );

    return res.json({
      success: true,
      message: 'Auction listing cancelled. Existing bid records remain preserved for audit.'
    });
  } catch (error) {
    console.error('Cancel auction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel auction.' });
  }
};

export const getMyAuctions = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        a.id,
        a.seller_id AS "sellerId",
        a.title,
        a.description,
        a.category,
        a.condition,
        a.starting_price AS "startingPrice",
        a.min_increment AS "minIncrement",
        a.end_time AS "endTime",
        a.status,
        a.created_at AS "createdAt",
        COALESCE(highest_bid.amount, a.starting_price) AS "currentBid",
        COALESCE(bid_stats.total_bids, 0)::int AS "bidCount",
        COALESCE(
          json_agg(img.image_path ORDER BY img.display_order ASC) FILTER (WHERE img.id IS NOT NULL), '[]'
        ) AS images
       FROM auctions a
       LEFT JOIN (
         SELECT auction_id, MAX(amount) AS amount FROM bids GROUP BY auction_id
       ) highest_bid ON highest_bid.auction_id = a.id
       LEFT JOIN (
         SELECT auction_id, COUNT(*) AS total_bids FROM bids GROUP BY auction_id
       ) bid_stats ON bid_stats.auction_id = a.id
       LEFT JOIN auction_images img ON img.auction_id = a.id
       WHERE a.seller_id = $1
       GROUP BY a.id, highest_bid.amount, bid_stats.total_bids
       ORDER BY a.created_at DESC;`,
      [req.user.id]
    );

    return res.json({
      success: true,
      auctions: result.rows.map(row => ({
        ...row,
        imageIds: row.images
      }))
    });
  } catch (error) {
    console.error('Fetch my auctions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load seller listings.' });
  }
};

