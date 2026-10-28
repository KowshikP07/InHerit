import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_inherit_campus_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (req, res) => {
  try {
    const { name, email, password, rollNo, department, year } = req.body;

    if (!name || !email || !password || !rollNo) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and roll number are mandatory.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRollNo = String(rollNo).trim().toUpperCase();

    // 1. Eligibility verification against college roster
    const rosterCheck = await query(
      'SELECT id, is_eligible FROM eligible_students WHERE email = $1',
      [normalizedEmail]
    );

    if (rosterCheck.rows.length === 0) {
      // Auto-enroll new campus student into eligible_students roster if not previously imported
      await query(
        `INSERT INTO eligible_students (name, email, student_id, department, is_eligible, registered_at)
         VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (email) DO UPDATE SET is_eligible = TRUE, registered_at = CURRENT_TIMESTAMP;`,
        [name.trim(), normalizedEmail, normalizedRollNo, department?.trim() || null]
      );
    } else if (!rosterCheck.rows[0].is_eligible) {
      // If student was explicitly disabled by Super Admin, block registration
      return res.status(403).json({
        success: false,
        message: 'Your campus account eligibility has been disabled by the Super Admin.'
      });
    }

    // 2. Prevent duplicate user registrations
    const existingUser = await query(
      'SELECT id, email, roll_number FROM users WHERE email = $1 OR roll_number = $2',
      [normalizedEmail, normalizedRollNo]
    );

    if (existingUser.rows.length > 0) {
      const match = existingUser.rows[0];
      const conflictField = match.email === normalizedEmail ? 'email' : 'roll number';
      return res.status(409).json({
        success: false,
        message: `An InHerit account with this ${conflictField} has already been registered.`
      });
    }

    // 3. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create student user in database
    const userRes = await query(
      `INSERT INTO users (name, email, roll_number, department, year, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'STUDENT', TRUE)
       RETURNING id, name, email, roll_number, department, year, role, created_at;`,
      [name.trim(), normalizedEmail, normalizedRollNo, department?.trim() || null, year ? String(year) : null, passwordHash]
    );

    const newUser = userRes.rows[0];

    // 5. Mark registered in roster
    await query(
      'UPDATE eligible_students SET registered_at = CURRENT_TIMESTAMP WHERE email = $1',
      [normalizedEmail]
    );

    // 6. Sign JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        roll_number: newUser.roll_number
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`✅ Stored student in database: ${newUser.name} (${newUser.email}, ${newUser.roll_number})`);

    return res.status(201).json({
      success: true,
      message: 'Student registration successful.',
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete registration due to server error.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query active user
    const userRes = await query(
      'SELECT id, name, email, roll_number, department, year, password_hash, role, is_active FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No student account found for this campus email. Please choose "Join campus" to register.'
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been temporarily disabled.'
      });
    }

    // Verify bcrypt password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password does not match.'
      });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roll_number: user.roll_number
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Sanitize user object
    delete user.password_hash;

    return res.json({
      success: true,
      message: 'Sign in successful.',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate user.'
    });
  }
};

export const getMe = (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
};
