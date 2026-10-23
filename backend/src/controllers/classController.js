import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import ClassModel from '../models/ClassModel.js';
import { v4 as uuidv4 } from 'uuid';

export const createClass = asyncHandler(async (req, res) => {
  const { name, subject } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const cls = await ClassModel.create({ name, subject, teacher: req.user._id, joinCode: uuidv4().slice(0, 8) });
  res.status(201).json({ class: cls });
});

export const listClasses = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'teacher' ? { teacher: req.user._id } : { students: req.user._id };
  const classes = await ClassModel.find(filter)
    .populate('teacher', 'name email')
    .populate('joinRequests.student', 'name email');
  res.json({ classes });
});

export const listAvailableClasses = asyncHandler(async (req, res) => {
  const classes = await ClassModel.find().populate('teacher', 'name email');
  const studentId = String(req.user._id);

  const result = classes.map((c) => {
    const isEnrolled = (c.students || []).some((s) => String(s) === studentId);
    const pendingReq = (c.joinRequests || []).find(
      (r) => String(r.student?._id || r.student) === studentId && r.status === 'pending'
    );
    return {
      _id: c._id,
      name: c.name,
      subject: c.subject,
      teacher: c.teacher,
      joinCode: c.joinCode,
      studentCount: (c.students || []).length,
      isEnrolled,
      isPending: Boolean(pendingReq),
      requestedAt: pendingReq ? pendingReq.requestedAt : null
    };
  });

  res.json({ classes: result });
});

export const requestJoinClass = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findById(req.params.id);
  if (!cls) throw new ApiError(404, 'Class not found');

  const studentId = String(req.user._id);
  if ((cls.students || []).some((s) => String(s) === studentId)) {
    throw new ApiError(400, 'You are already enrolled in this class');
  }

  cls.joinRequests = cls.joinRequests || [];
  const existingPending = cls.joinRequests.find(
    (r) => String(r.student) === studentId && r.status === 'pending'
  );
  if (existingPending) {
    throw new ApiError(400, 'Join request is already pending teacher approval');
  }

  const existingIndex = cls.joinRequests.findIndex((r) => String(r.student) === studentId);
  if (existingIndex >= 0) {
    cls.joinRequests[existingIndex].status = 'pending';
    cls.joinRequests[existingIndex].requestedAt = new Date();
  } else {
    cls.joinRequests.push({ student: req.user._id, status: 'pending', requestedAt: new Date() });
  }

  await cls.save();
  res.json({ message: 'Join request submitted! The teacher will review your request.', classId: cls._id });
});

export const handleJoinRequest = asyncHandler(async (req, res) => {
  const { studentId, action } = req.body;
  if (!studentId || !action) throw new ApiError(400, 'studentId and action are required');
  if (!['approve', 'reject'].includes(action)) throw new ApiError(400, 'Invalid action (must be approve or reject)');

  const cls = await ClassModel.findById(req.params.id);
  if (!cls) throw new ApiError(404, 'Class not found');

  if (String(cls.teacher) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Only the class teacher can manage join requests');
  }

  cls.joinRequests = cls.joinRequests || [];
  const reqIndex = cls.joinRequests.findIndex(
    (r) => String(r.student?._id || r.student) === String(studentId) && r.status === 'pending'
  );

  if (reqIndex === -1) {
    throw new ApiError(404, 'Pending request not found for this student');
  }

  if (action === 'approve') {
    cls.joinRequests[reqIndex].status = 'approved';
    if (!cls.students.some((s) => String(s) === String(studentId))) {
      cls.students.push(studentId);
    }
  } else {
    cls.joinRequests[reqIndex].status = 'rejected';
  }

  await cls.save();

  const updated = await ClassModel.findById(cls._id)
    .populate('students', 'name email')
    .populate('teacher', 'name email')
    .populate('joinRequests.student', 'name email');

  res.json({ message: `Request successfully ${action}d!`, class: updated });
});

export const joinClass = asyncHandler(async (req, res) => {
  const { joinCode } = req.body;
  const cls = await ClassModel.findOne({ joinCode: (joinCode || '').trim().toUpperCase() });
  if (!cls) throw new ApiError(404, 'Invalid join code');
  if (!cls.students.includes(req.user._id)) {
    cls.students.push(req.user._id);
    await cls.save();
  }
  res.json({ class: cls });
});

export const getClass = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findById(req.params.id)
    .populate('students', 'name email')
    .populate('teacher', 'name email')
    .populate('joinRequests.student', 'name email');
  if (!cls) throw new ApiError(404, 'Class not found');

  const userIdStr = String(req.user._id);
  const isTeacher = req.user.role === 'teacher' && String(cls.teacher?._id || cls.teacher) === userIdStr;
  const isStudent = req.user.role === 'student' && cls.students.some((s) => String(s._id || s) === userIdStr);
  const isAdmin = req.user.role === 'admin';

  if (!isTeacher && !isStudent && !isAdmin) {
    throw new ApiError(403, 'Forbidden: You do not have access to this class');
  }

  res.json({ class: cls });
});
