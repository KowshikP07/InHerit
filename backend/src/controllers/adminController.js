import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_inherit_campus_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin email and password are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const adminRes = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (adminRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.'
      });
    }

    const admin = adminRes.rows[0];

    if (admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to Super Administrators only.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.'
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    delete admin.password_hash;

    return res.json({
      success: true,
      message: 'Super Admin authentication verified.',
      user: admin,
      token
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during administrative authentication.'
    });
  }
};

export const getRoster = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, student_id AS "rollNo", department, is_eligible AS "eligible", registered_at AS "registeredAt", created_at AS "createdAt"
       FROM eligible_students
       ORDER BY created_at DESC;`
    );

    return res.json({
      success: true,
      roster: result.rows
    });
  } catch (error) {
    console.error('Fetch roster error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve eligible student roster.'
    });
  }
};

export const toggleEligibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { eligible } = req.body;

    const result = await query(
      `UPDATE eligible_students
       SET is_eligible = COALESCE($2, NOT is_eligible)
       WHERE id = $1
       RETURNING id, name, email, student_id AS "rollNo", department, is_eligible AS "eligible";`,
      [id, typeof eligible === 'boolean' ? eligible : null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found in roster.'
      });
    }

    return res.json({
      success: true,
      message: `Eligibility ${result.rows[0].eligible ? 'granted' : 'revoked'}.`,
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle eligibility error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student eligibility status.'
    });
  }
};

export const removeStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM eligible_students WHERE id = $1 RETURNING id, name, email;',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found in roster.'
      });
    }

    return res.json({
      success: true,
      message: `Student record ${result.rows[0].name} removed from roster.`,
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Remove student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student record.'
    });
  }
};

export const importCsvRoster = async (req, res) => {
  try {
    let rowsToProcess = [];
    let filename = 'manual_import.csv';

    if (req.file) {
      filename = req.file.originalname;
      const csvText = req.file.buffer.toString('utf8');
      rowsToProcess = parseCsvText(csvText);
    } else if (Array.isArray(req.body.students)) {
      rowsToProcess = req.body.students;
      filename = req.body.filename || 'web_roster_import.csv';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a CSV file or student array payload.'
      });
    }

    // Fetch existing emails & roll numbers to deduplicate
    const existingRes = await query('SELECT email, student_id FROM eligible_students;');
    const existingEmails = new Set(existingRes.rows.map(r => r.email.toLowerCase()));
    const existingRollNos = new Set(existingRes.rows.map(r => String(r.student_id).trim().toLowerCase()));

    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const item of rowsToProcess) {
      const email = String(item.email || item.Email || '').trim().toLowerCase();
      const rollNo = String(item.rollNo || item.RollNo || item.student_id || '').trim();
      const name = String(item.name || item.Name || '').trim();
      const department = String(item.department || item.Dept || item.dept || '').trim();

      // Basic validation
      if (!email || !rollNo || !name || !email.includes('@')) {
        invalidCount++;
        continue;
      }

      const rollKey = rollNo.toLowerCase();
      if (existingEmails.has(email) || existingRollNos.has(rollKey)) {
        duplicateCount++;
        continue;
      }

      await query(
        `INSERT INTO eligible_students (name, email, student_id, department, is_eligible)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO NOTHING;`,
        [name, email, rollNo, department || null]
      );

      existingEmails.add(email);
      existingRollNos.add(rollKey);
      addedCount++;
    }

    // Log the import batch in persistent audit history
    await query(
      `INSERT INTO import_batches (admin_id, filename, total_rows, successful_rows, duplicate_rows, invalid_rows)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [req.user?.id || null, filename, rowsToProcess.length, addedCount, duplicateCount, invalidCount]
    );

    return res.status(201).json({
      success: true,
      message: `Import processed: ${addedCount} student(s) added, ${duplicateCount} duplicate(s), ${invalidCount} invalid.`,
      stats: {
        totalRows: rowsToProcess.length,
        added: addedCount,
        duplicates: duplicateCount,
        invalid: invalidCount
      }
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process student roster import.'
    });
  }
};

export const getImportHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, filename, total_rows AS "totalRows", successful_rows AS "added", duplicate_rows AS "duplicates", invalid_rows AS "invalid", created_at AS "importedAt"
       FROM import_batches
       ORDER BY created_at DESC;`
    );

    return res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Fetch import history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load import audit logs.'
    });
  }
};

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }

  return rows;
}

