import { Router } from 'express';
import {
  loginAdmin,
  getRoster,
  toggleEligibility,
  removeStudent,
  importCsvRoster,
  getImportHistory
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadCsv } from '../middleware/upload.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Super Admin Authentication
router.post('/login', authLimiter, loginAdmin);

// Super Admin Roster Management (Protected by SUPER_ADMIN role)
router.use(authenticateToken, requireRole('SUPER_ADMIN'));

router.get('/roster', getRoster);
router.patch('/roster/:id/eligibility', toggleEligibility);
router.delete('/roster/:id', removeStudent);
router.post('/roster/import', uploadCsv.single('file'), importCsvRoster);
router.get('/history', getImportHistory);

export default router;

