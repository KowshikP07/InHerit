import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend folder regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set in environment! Checked path:', path.resolve(__dirname, '../../.env'));
}

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      ssl: false
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query:', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout of 10 seconds for safety
  const timeout = setTimeout(() => {
    console.error('A PostgreSQL client has been checked out for more than 10 seconds!');
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
};

export default {
  pool,
  query,
  getClient
};
