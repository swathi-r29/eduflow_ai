import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createSubmission,
  createPublicSubmission,
  ocrSubmission,
  preflightCheck,
  triggerGradingPipeline,
  auditGradingConsistency,
  getClassReTeachPlan,
  getTeacherReviewStrategy,
  checkAssignmentPlagiarism,
  getSubmission,
  listSubmissions,
  calibrateGrading,
  completeJourneyNode,
  requestGradeAppeal,
  submitOralDefense,
  quickFixAndSandboxRerun
} from '../controllers/submissionController.js';

const router = Router();

// 1. Public Student Portal Submissions (No Auth Required)
router.post('/public/:assignmentId', createPublicSubmission);

// 2. Pre-Flight AI Draft Coach (Draft readiness check)
router.post('/preflight', preflightCheck);

// 3. Authenticated Student Submissions & OCR
router.use(requireAuth);
router.post('/', requireRole('student'), createSubmission);
router.post('/ocr', ocrSubmission);

// 4. Journey Skill Tree Nodes
router.post('/journey/complete-node', completeJourneyNode);

// 5. Grading Pipeline Trigger & Analytics
router.post('/grading/:id', triggerGradingPipeline);
router.post('/audit/:id', auditGradingConsistency);
router.post('/class-reteach/:assignmentId', requireRole('teacher'), getClassReTeachPlan);
router.post('/teacher-review-strategy', requireRole('teacher'), getTeacherReviewStrategy);
router.post('/plagiarism/:assignmentId', requireRole('teacher', 'admin'), checkAssignmentPlagiarism);

// 6. Interactive Oral Defense, Appeal & Sandbox Re-Run
router.post('/:id/appeal', requestGradeAppeal);
router.post('/:id/defense', submitOralDefense);
router.post('/:id/quick-fix', quickFixAndSandboxRerun);

// 7. Querying & Calibration
router.get('/mine', listSubmissions);
router.get('/', listSubmissions);
router.get('/assignment/:assignmentId', listSubmissions);
router.get('/:id', getSubmission);
router.post('/grading/:id/calibrate', requireRole('teacher'), calibrateGrading);

export default router;

