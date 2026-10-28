import rateLimit from 'express-rate-limit';

// Standard rate limiter for general API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client. Please slow down.'
  }
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// Dedicated rate limiter for placing bids (protects from rapid-fire spam)
export const bidLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 bids per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bid submission rate exceeded. Please pace your bids.'
  }
});

