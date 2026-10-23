import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import Assignment from '../models/Assignment.js';
import ClassModel from '../models/ClassModel.js';

export function classifyAssignmentType({ question = '', sampleSolution = '', title = '', evaluationType = null }) {
  const text = `${title} ${question} ${sampleSolution}`.toLowerCase();
  const sampleLower = (sampleSolution || '').toLowerCase();
  const questionLower = (question || '').toLowerCase();

  const hasCodeSyntax =
    /def\s+[a-zA-Z0-9_]+\s*\(/.test(sampleSolution + ' ' + question) ||
    sampleLower.includes('return ') ||
    sampleLower.includes('def ') ||
    sampleLower.includes('class ') ||
    sampleLower.includes('import ') ||
    sampleLower.includes('print(') ||
    sampleLower.includes('system.out.print') ||
    questionLower.includes('write a python function') ||
    questionLower.includes('write a function') ||
    questionLower.includes('write a program') ||
    questionLower.includes('write code') ||
    questionLower.includes('function called') ||
    questionLower.includes('implement a function') ||
    questionLower.includes('implement a method') ||
    questionLower.includes('find_top_students');

  if (hasCodeSyntax) {
    return 'PROGRAMMING';
  }

  if (evaluationType && ['PROGRAMMING', 'THEORY', 'ESSAY', 'MIXED'].includes(evaluationType)) {
    return evaluationType;
  }

  const isTheoryTask =
    text.includes('explain') ||
    text.includes('describe') ||
    text.includes('compare') ||
    text.includes('discuss') ||
    text.includes('differs from') ||
    text.includes('what is');

  if (isTheoryTask) {
    return 'THEORY';
  }

  return 'THEORY';
}

export const createAssignment = asyncHandler(async (req, res) => {
  const { classId, title, question, sampleSolution, referenceMaterial, rubric, maxScore, dueDate, evaluationType } = req.body;
  if (!classId) throw new ApiError(400, 'Class selection is required');
  if (!title || !question) throw new ApiError(400, 'Title and Question are required');

  const cls = await ClassModel.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');
  if (req.user.role !== 'admin' && String(cls.teacher) !== String(req.user._id)) {
    throw new ApiError(403, 'Forbidden: You can only create assignments for your own class');
  }

  const finalType = evaluationType || classifyAssignmentType({ question, sampleSolution, title });
  const funcMatch = (sampleSolution || question).match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
  const targetFunction = finalType === 'PROGRAMMING' ? (funcMatch ? funcMatch[1] : null) : null;
  const language = finalType === 'PROGRAMMING' ? 'python' : null;

  const assignment = await Assignment.create({
    class: classId,
    teacher: req.user._id,
    title,
    question,
    sampleSolution,
    referenceMaterial,
    evaluationType: finalType,
    language,
    targetFunction,
    rubric: rubric || [],
    maxScore: maxScore || 100,
    dueDate
  });
  res.status(201).json({ assignment });
});

export const listAssignments = asyncHandler(async (req, res) => {
  const filter = {};
  const classId = req.query.classId || req.params.classId;
  if (classId) {
    filter.class = classId;
  } else if (req.user.role === 'student') {
    const studentClasses = await ClassModel.find({ students: req.user._id }).select('_id');
    filter.class = { $in: studentClasses.map((c) => c._id) };
  }

  if (req.user.role === 'teacher') {
    filter.teacher = req.user._id;
  }

  const assignments = await Assignment.find(filter)
    .populate('class', 'name subject joinCode')
    .sort({ createdAt: -1 });
  res.json({ assignments });
});

export const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  res.json({ assignment });
});

/**
 * Save 1-3 teacher-graded calibration ground truth examples
 * POST /api/assignments/:id/calibrate
 */
export const saveCalibrationExamples = asyncHandler(async (req, res) => {
  const { examples } = req.body;
  if (!Array.isArray(examples)) {
    throw new ApiError(400, 'examples must be an array of graded submissions');
  }

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');

  if (req.user.role !== 'admin' && String(assignment.teacher) !== String(req.user._id)) {
    throw new ApiError(403, 'Forbidden: Only the assignment instructor can configure calibration');
  }

  // Format and retain up to 3 examples
  assignment.calibrationExamples = examples.slice(0, 3).map((ex) => ({
    submissionText: ex.submissionText || '',
    totalScore: Number(ex.totalScore) || 0,
    teacherNotes: ex.teacherNotes || '',
    criteriaScores: (ex.criteriaScores || []).map((cs) => ({
      criterion: cs.criterion,
      score: Number(cs.score) || 0,
      reasoning: cs.reasoning || ''
    }))
  }));

  await assignment.save();

  res.json({
    message: 'Calibration examples saved successfully',
    calibrationExamples: assignment.calibrationExamples
  });
});