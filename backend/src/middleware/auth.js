import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_inherit_campus_2026');
    
    // Verify user exists and is active in database
    const userRes = await query(
      'SELECT id, name, email, roll_number, department, year, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated or no longer exists.'
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session. Please sign in again.'
    });
  }
};

export const requireRole = (roles = []) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this administrative action.'
      });
    }
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_inherit_campus_2026');
    const userRes = await query(
      'SELECT id, name, email, roll_number, department, year, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length > 0 && userRes.rows[0].is_active) {
      req.user = userRes.rows[0];
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
};

