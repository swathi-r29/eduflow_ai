import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createClass,
  listClasses,
  listAvailableClasses,
  joinClass,
  requestJoinClass,
  handleJoinRequest,
  getClass
} from '../controllers/classController.js';

const router = Router();
router.use(requireAuth);
router.post('/', requireRole('teacher'), createClass);
router.get('/', listClasses);
router.get('/available', requireRole('student'), listAvailableClasses);
router.post('/join', requireRole('student'), joinClass);
router.post('/:id/request-join', requireRole('student'), requestJoinClass);
router.post('/:id/approve-request', requireRole('teacher'), handleJoinRequest);
router.get('/:id', getClass);

export default router;
