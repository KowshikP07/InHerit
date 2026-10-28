import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { query } from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import { getMyAuctions } from './controllers/auctionController.js';
import { authenticateToken } from './middleware/auth.js';
import { initAuctionScheduler } from './services/auctionScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_inherit_campus_2026';

// 1. Socket.IO Setup with Real-Time Bidding Rooms
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow local dev origins or configured CLIENT_URL
      if (!origin || origin.startsWith('http://localhost') || origin === CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Real-time Socket.IO room management
io.on('connection', (socket) => {
  // Join auction-specific room for live bidding updates
  socket.on('join_auction', (auctionId) => {
    if (auctionId) {
      socket.join(`auction:${auctionId}`);
    }
  });

  socket.on('leave_auction', (auctionId) => {
    if (auctionId) {
      socket.leave(`auction:${auctionId}`);
    }
  });

  // Authenticated user private notification room
  socket.on('join_user', (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        socket.join(`user:${decoded.id}`);
      }
    } catch {
      // Ignore invalid socket auth tokens
    }
  });
});

// 2. Global Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin === CLIENT_URL) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// 3. Serve uploaded auction images locally
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/sales', saleRoutes);
app.get('/api/users/me/auctions', authenticateToken, getMyAuctions);

// 5. System Health Check with PostgreSQL verification
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await query('SELECT NOW() as current_time, current_database() as db_name, version();');
    res.json({
      status: 'UP',
      app: 'InHerit - Fair Campus Auction Marketplace',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        db_name: dbRes.rows[0].db_name,
        server_time: dbRes.rows[0].current_time,
        version: dbRes.rows[0].version
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      app: 'InHerit - Fair Campus Auction Marketplace',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// 6. Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// 7. Start Auction Finalization Scheduler
initAuctionScheduler();

// 8. Start HTTP Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 InHerit backend running on port ${PORT}`);
    console.log(`📡 Real-time Socket.IO initialized for client: ${CLIENT_URL}`);
    console.log(`📁 Local uploads served from: ${path.join(__dirname, '../uploads')}`);
  });
}

export default server;
