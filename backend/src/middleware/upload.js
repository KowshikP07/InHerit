import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with secure unique naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate crypto random filename to prevent any path traversal or collision
    const randomHex = crypto.randomBytes(12).toString('hex');
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${safeExt}`);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);

export const uploadImages = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024, // 5 MB per file
    files: 5 // up to 5 images per listing
  },
  fileFilter
});

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB for roster CSV
  },
  fileFilter: (req, file, cb) => {
    const isCsv = file.mimetype === 'text/csv' ||
                  file.mimetype === 'application/vnd.ms-excel' ||
                  path.extname(file.originalname).toLowerCase() === '.csv';
    if (isCsv) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .csv files are supported.'));
    }
  }
});

