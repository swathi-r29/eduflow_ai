export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  xp?: number;
  level?: number;
  streak?: number;
  completedNodes?: string[];
}

export interface JoinRequest {
  _id?: string;
  student: { _id: string; name: string; email: string };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface ClassItem {
  _id: string;
  name: string;
  subject?: string;
  joinCode?: string;
  students: any[];
  teacher: { _id: string; name: string; email: string } | string;
  joinRequests?: JoinRequest[];
}

export interface RubricCriterion {
  criterion: string;
  maxPoints: number;
  description?: string;
}

export interface Assignment {
  _id: string;
  class: string | { _id: string; name: string; subject?: string };
  title: string;
  question: string;
  sampleSolution?: string;
  evaluationType?: 'PROGRAMMING' | 'THEORY' | 'ESSAY' | 'MIXED';
  language?: string | null;
  targetFunction?: string | null;
  rubric: RubricCriterion[];
  maxScore: number;
  dueDate?: string;
}

export interface Submission {
  _id: string;
  assignment: Assignment | string;
  student: string;
  answerText: string;
  status: 'submitted' | 'ai_processing' | 'ai_evaluated' | 'teacher_reviewed';
}

export interface GradingResult {
  _id: string;
  understanding: {
    understoodTask: boolean;
    expectedConcepts: string[];
    demonstratedConcepts: string[];
    missingConcepts: string[];
    reasoningSummary: string;
    evidence: string[];
  };
  rubricEvaluation: {
    totalScore: number;
    maxScore: number;
    criteriaScores: { criterion: string; score: number; maxPoints: number; reasoning: string; evidence: string }[];
  };
  rootCause: {
    errorCategory: string;
    detectedMisconception: string;
    expectedConcept?: string;
    rootReason: string;
    confidence: number;
  };
  executionResults?: {
    applicable?: boolean;
    reason?: string;
    passed?: boolean;
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    status?: string;
    functionName?: string;
    tests?: { name: string; passed: boolean; input: any; expected: any; actual: any; reason?: string }[];
    failedTestsList?: { name: string; input: any; expected: any; actual: any; reason?: string }[];
  } | null;
  failedTests?: any[];
  staticAnalysis?: any;
  aiAnalysis?: any;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    explanation: string;
    actionableSteps: string[];
  };
  recommendedResource?: {
    sourceType: 'document' | 'video';
    sourceId: string;
    sourceName: string;
    workspaceId: string;
    startTime?: number | null;
    endTime?: number | null;
    page?: number | null;
    snippet?: string;
  } | null;
  aiScore: number;
  aiMaxScore: number;
  aiConfidence: number;
  teacherScore: number | null;
  teacherFeedback?: string | null;
  teacherStatus: 'pending' | 'accepted' | 'edited' | 'overridden';
}

export interface Workspace {
  _id: string;
  title: string;
  description?: string;
  documents: DocumentItem[] | string[];
  videos: VideoItem[] | string[];
}

export interface DocumentItem {
  _id: string;
  originalName: string;
  storedPath?: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  summary?: string;
}

export interface VideoItem {
  _id: string;
  originalName: string;
  storedPath?: string;
  youtubeUrl?: string;
  mimeType?: string;
  status: string;
  summary?: string;
  topics?: string[];
  concepts?: string[];
  keyPoints?: string[];
  importantTimestamps?: {
    timestamp: string;
    startTime?: number;
    endTime?: number;
    clipStartTime?: number;
    clipEndTime?: number;
    clipDuration?: number;
    topic: string;
    description: string;
    conceptPrinciple?: string;
  }[];
}

export interface TutorSource {
  sourceType: 'document' | 'video';
  sourceId?: string | null;
  sourceName: string;
  startTime?: number | null;
  endTime?: number | null;
  page?: number | null;
}

export interface ConceptMastery {
  concept: string;
  masteryScore: number;
  confidence: number;
  level: string;
  attempts: number;
}
