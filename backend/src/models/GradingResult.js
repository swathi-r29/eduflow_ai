import mongoose from 'mongoose';

const gradingResultSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  understanding: { type: mongoose.Schema.Types.Mixed }, // SubmissionUnderstandingAgent output
  executionResults: { type: mongoose.Schema.Types.Mixed }, // Deterministic execution evidence (tests passed/failed, expected vs actual)
  failedTests: { type: mongoose.Schema.Types.Mixed, default: [] }, // Array of failed test cases
  staticAnalysis: { type: mongoose.Schema.Types.Mixed }, // AST / Static analysis
  aiAnalysis: { type: mongoose.Schema.Types.Mixed }, // AI confidence and metrics
  rubricEvaluation: { type: mongoose.Schema.Types.Mixed }, // RubricEvaluationAgent output
  rootCause: { type: mongoose.Schema.Types.Mixed }, // RootCauseAgent output
  feedback: { type: mongoose.Schema.Types.Mixed }, // FeedbackAgent output
  recommendedResource: { type: mongoose.Schema.Types.Mixed }, // Uploaded content recommendation

  aiScore: { type: Number },
  aiMaxScore: { type: Number },
  aiConfidence: { type: Number, default: 1.0 },

  // Teacher Review Routing Flags
  requiresTeacherReview: { type: Boolean, default: false, index: true },
  reviewReason: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['draft', 'needs_review', 'published', 'overridden'], 
    default: 'published',
    index: true 
  },

  teacherScore: { type: Number, default: null },
  teacherFeedback: { type: String, default: null },
  teacherStatus: { type: String, enum: ['pending', 'accepted', 'edited', 'overridden'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('GradingResult', gradingResultSchema);