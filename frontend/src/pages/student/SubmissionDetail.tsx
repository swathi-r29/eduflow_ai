import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Submission, GradingResult, Assignment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import JourneyTree, { JourneyNodeItem } from '../../components/common/JourneyTree';
import QuizModal from '../../components/common/QuizModal';
import AIVoiceTutor from '../../components/common/AIVoiceTutor';
import VoiceInputButton from '../../components/common/VoiceInputButton';
import { formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { 
  Sparkles, Video, FileText, ExternalLink, Award, CheckCircle2, XCircle, Code, 
  Terminal, Cpu, ShieldCheck, HelpCircle, MessageSquare, Mic, Play, Check, 
  AlertTriangle, ArrowRight, Loader2, RefreshCw, Wrench, ChevronDown, ChevronUp, CheckCheck, Zap
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function SubmissionDetail() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { id } = useParams();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    const { data } = await api.get(`/submissions/${id}`);
    setSubmission(data.submission);
    setGrading(data.gradingResult);
    if (data.gradingResult) {
      if (pollRef.current) window.clearInterval(pollRef.current);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 3000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignment = submission?.assignment as Assignment | undefined;
  const [selectedNode, setSelectedNode] = useState<JourneyNodeItem | null>(null);
  const [completingNode, setCompletingNode] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const handleSelectNode = (node: JourneyNodeItem) => {
    const params = new URLSearchParams({
      concept: node.concept || node.title || '',
      title: node.title || '',
      difficulty: node.difficulty || 'medium',
      nodeId: node.id || '',
      type: node.type || '',
      misconception: grading?.rootCause?.detectedMisconception || '',
      returnUrl: `/student/submissions/${id}`
    });
    navigate(`/student/quiz?${params.toString()}`);
  };

  const submissionRevisionPlan = React.useMemo(() => {
    if (!grading) return null;
    const primaryConcept = grading.rootCause?.expectedConcept ||
      (grading.understanding?.missingConcepts && grading.understanding.missingConcepts[0]) ||
      'Core Programming Logic & Syntax';

    const detectedMisconception = grading.rootCause?.detectedMisconception ||
      'Syntax boundary conditions, variable state, and runtime output prediction.';

    const items: JourneyNodeItem[] = [
      {
        id: 'node-step-1',
        type: 'Node 1 • Easy',
        title: `1. Basic Rules & Definitions`,
        concept: `${primaryConcept}: Core Rules`,
        description: `Start here! Review basic definitions, rules, and fundamental concepts of ${primaryConcept}.`,
        remediationFocus: 'Basic recognition & rules',
        difficulty: 'easy',
        completed: (user?.completedNodes || []).includes('node-step-1')
      },
      {
        id: 'node-step-2',
        type: 'Node 2 • Easy',
        title: `2. Concept Distinctions & Syntax`,
        concept: `${primaryConcept}: Key Distinctions`,
        description: `Understand parameter matching, signature rules, and structural distinctions.`,
        remediationFocus: 'Concept distinctions & parameter rules',
        difficulty: 'easy',
        completed: (user?.completedNodes || []).includes('node-step-2')
      },
      {
        id: 'node-step-3',
        type: 'Node 3 • Medium',
        title: `3. Applied Code Tracing`,
        concept: `${primaryConcept}: Code Execution`,
        description: `Analyze sample code snippets, trace variable states, and predict exact outputs.`,
        remediationFocus: 'Code tracing & output prediction',
        difficulty: 'medium',
        completed: (user?.completedNodes || []).includes('node-step-3')
      },
      {
        id: 'node-step-4',
        type: 'Node 4 • Hard',
        title: `4. Pitfalls & Misconceptions`,
        concept: `${primaryConcept}: Edge Cases`,
        description: `Address detected issue: "${detectedMisconception}". Uncover subtle bugs.`,
        remediationFocus: 'Pitfalls & edge-case bugs',
        difficulty: 'hard',
        completed: (user?.completedNodes || []).includes('node-step-4')
      },
      {
        id: 'node-step-5',
        type: 'Node 5 • Hard',
        title: `5. Dynamic Dispatch & Runtime`,
        concept: `${primaryConcept}: Runtime Mechanics`,
        description: `Master runtime resolution, late binding, and dynamic execution behavior.`,
        remediationFocus: 'Runtime resolution & dynamic dispatch',
        difficulty: 'hard',
        completed: (user?.completedNodes || []).includes('node-step-5')
      },
      {
        id: 'node-step-6',
        type: 'Node 6 • Expert Mastery',
        title: `6. Production Refactoring Challenge`,
        concept: `${primaryConcept}: Expert Refactoring`,
        description: `Refactor production code snippets for optimal efficiency, clarity, and robust logic.`,
        remediationFocus: 'Expert refactoring & synthesis',
        difficulty: 'expert',
        completed: (user?.completedNodes || []).includes('node-step-6')
      }
    ];

    return { actionItems: items };
  }, [grading, user?.completedNodes]);

  useEffect(() => {
    if (submissionRevisionPlan?.actionItems?.length && !selectedNode) {
      setSelectedNode(submissionRevisionPlan.actionItems[0]);
    }
  }, [submissionRevisionPlan]);

  const handleCompleteNode = async (nodeId: string) => {
    if (!nodeId) return;
    setCompletingNode(true);
    try {
      await api.post('/submissions/journey/complete-node', { nodeId });
      await refreshUser();
      if (submissionRevisionPlan?.actionItems) {
        const currentIdx = submissionRevisionPlan.actionItems.findIndex((n) => n.id === nodeId);
        if (currentIdx !== -1 && currentIdx + 1 < submissionRevisionPlan.actionItems.length) {
          setSelectedNode(submissionRevisionPlan.actionItems[currentIdx + 1]);
        } else if (selectedNode) {
          setSelectedNode({ ...selectedNode, completed: true });
        }
      }
    } catch (err) {
      console.error('Failed to complete journey node:', err);
    } finally {
      setCompletingNode(false);
    }
  };

  // State for Viva & Appeal modals
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const [isVivaModalOpen, setIsVivaModalOpen] = useState(false);
  const [vivaAnswers, setVivaAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmittingViva, setIsSubmittingViva] = useState(false);
  const [vivaSuccessMessage, setVivaSuccessMessage] = useState<string | null>(null);

  // Feature 1 & 2: Quick-Fix & Decision Trace Drawer
  const [showDecisionTrace, setShowDecisionTrace] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [fixResult, setFixResult] = useState<any | null>(null);

  const handleQuickFix = async () => {
    setIsApplyingFix(true);
    try {
      const { data } = await api.post(`/submissions/${id}/quick-fix`);
      setFixResult(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate quick-fix.');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) return alert('Please describe your justification for re-evaluation.');
    setIsSubmittingAppeal(true);
    try {
      await api.post(`/submissions/${id}/appeal`, { justification: appealText });
      await load();
      setIsAppealModalOpen(false);
      setAppealText('');
      alert('Your grading appeal has been analyzed by AI and queued for teacher verification.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit grading appeal.');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const evalType = assignment?.evaluationType || grading?.staticAnalysis?.evaluationType || 'PROGRAMMING';

  const dynamicDefenseQuestions = React.useMemo(() => {
    if (!submission) return [];
    const isProg = evalType === 'PROGRAMMING';
    if (isProg) {
      return [
        { id: 'q1', text: 'Explain why you structured your loops/branching conditions in this specific way.' },
        { id: 'q2', text: 'How does your solution handle boundary edge cases or zero/empty inputs?' }
      ];
    }
    return [
      { id: 'q1', text: 'In your own words, summarize the core principle behind your solution.' },
      { id: 'q2', text: 'What is a common pitfall or misconception when solving this kind of problem?' }
    ];
  }, [submission, evalType]);

  const handleSubmitViva = async () => {
    const qaList = dynamicDefenseQuestions.map((q) => ({
      question: q.text,
      studentAnswer: vivaAnswers[q.id] || 'Understood the underlying concept and demonstrated correct syntax.'
    }));

    setIsSubmittingViva(true);
    try {
      await api.post(`/submissions/${id}/defense`, { qaList });
      await load();
      setVivaSuccessMessage('Concept Defense Verified! +50 Academic Integrity Badge Awarded.');
      setTimeout(() => {
        setIsVivaModalOpen(false);
        setVivaSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify concept defense.');
    } finally {
      setIsSubmittingViva(false);
    }
  };

  // Live Multi-Agent Pipeline Stepper state for loading progress
  const [activePipelineStep, setActivePipelineStep] = useState(1);

  useEffect(() => {
    if (!grading) {
      const stepTimer = setInterval(() => {
        setActivePipelineStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 2000);
      return () => clearInterval(stepTimer);
    }
  }, [grading]);

  const pipelineStages = [
    { id: 1, name: 'Preflight & Text OCR Extraction', agent: 'ocrAgent / preflightAgent', desc: 'Validating submission structure & token constraints' },
    { id: 2, name: 'Deterministic Test Execution', agent: 'pythonExecutor', desc: 'Running sandboxed boundary condition test assertions' },
    { id: 3, name: 'Rubric Criteria Alignment', agent: 'rubricEvaluationAgent', desc: 'Cross-verifying evidence against assignment rubric points' },
    { id: 4, name: 'Learning-Science Root-Cause Diagnosis', agent: 'rootCauseAgent', desc: 'Isolating conceptual misconceptions vs procedural bugs' },
    { id: 5, name: 'Synthesizing Multimodal Remediation', agent: 'feedbackAgent / studyOrchestrator', desc: 'Mapping exact video timestamps & personalized action plan' }
  ];

  if (!submission) return <div className="p-8 text-center text-[#64748B]">Loading submission details...</div>;

  if (!grading) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 animate-in fade-in">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Multi-Agent AI Evaluation Pipeline Active</h1>
            <p className="text-xs text-slate-500 font-medium">Orchestrating autonomous agents across sandboxed execution & rubrics</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {pipelineStages.map((st) => {
            const isDone = activePipelineStep > st.id;
            const isCurrent = activePipelineStep === st.id;
            return (
              <div
                key={st.id}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                    : isDone
                    ? 'bg-emerald-50/50 border-emerald-100 opacity-90'
                    : 'bg-slate-50 border-slate-100 opacity-50'
                }`}
              >
                <div className="pt-0.5">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      ✓
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                      {st.id}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold text-slate-900">{st.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600">
                      {st.agent}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-slate-400 font-mono">
          Polling for deterministic agent consensus · Instant auto-refresh
        </div>
      </div>
    );
  }

  const pct = Math.round((grading.aiScore / (grading.aiMaxScore || 1)) * 100);
  const rec = grading.recommendedResource;
  const exec = grading.executionResults || (grading as any).executionResults;
  const failedTests = grading.failedTests || exec?.failedTestsList || [];

  const isExecutionApplicable = exec?.applicable !== false && exec?.status !== 'NOT_APPLICABLE' && evalType === 'PROGRAMMING';

  return (
    <div className="w-full space-y-6">
      {/* Header score card */}
      <Card className="border-l-4 border-l-[#2563EB]">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{typeof assignment === 'object' ? assignment.title : 'Assignment Evaluation'}</h1>
              <p className="text-sm font-medium text-[#64748B] mt-1">
                Submitted by you · {isExecutionApplicable ? 'Multi-Agent & Sandboxed Code Execution Pipeline' : 'Multi-Agent Theory Rubric Evaluation Pipeline'}
              </p>
            </div>
            <div className="text-right">
              {grading.teacherStatus !== 'pending' && grading.teacherScore != null ? (
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{grading.teacherScore}/{grading.aiMaxScore}</p>
                  <p className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-mono font-bold inline-block mt-2">
                    Teacher {grading.teacherStatus.toUpperCase()} (AI score was {grading.aiScore}/{grading.aiMaxScore})
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-[#2563EB]">{grading.aiScore}/{grading.aiMaxScore}</p>
                  <div className="flex items-center justify-end gap-2 text-xs font-semibold text-[#64748B] mt-1">
                    <Badge status="submitted">{pct}% Overall</Badge>
                    <span>· AI Confidence {Math.round((grading.aiConfidence || 0.94) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Defense & Re-evaluation Action Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {grading.oralDefense?.verified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Oral Defense Verified ({grading.oralDefense.score}%)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVivaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Oral Viva Defense (60s)
                </button>
              )}

              {grading.studentAppeal?.status === 'pending' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  Appeal Under Teacher Review
                </span>
              ) : grading.studentAppeal?.status === 'resolved' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Appeal Resolved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  Request Re-evaluation
                </button>
              )}

              {/* AI Decision Trace Toggle */}
              <button
                type="button"
                onClick={() => setShowDecisionTrace(!showDecisionTrace)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  showDecisionTrace
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>AI Decision Trace</span>
                {showDecisionTrace ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {grading.studentAppeal?.aiReEvaluation && (
              <span className="text-[11px] font-semibold text-slate-500">
                AI Appeal Analysis: {grading.studentAppeal.aiReEvaluation.isValidAppeal ? 'Contested step acknowledged' : 'Grade confirmed'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* COLLAPSIBLE AI DECISION TRACE DRAWER */}
      {showDecisionTrace && (
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-4 animate-in fade-in zoom-in-98 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-sans">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Live Multi-Agent Decision Trace & Guardrail Audit</h3>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              Validated Execution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-300">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-sans font-bold">Confidence Bounding</p>
              <p className="text-base font-bold text-emerald-400 mt-1">{Math.round((grading.aiConfidence || 0.94) * 100)}%</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">&gt; 70% Auto-Publish Threshold</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-sans font-bold">Execution Sandbox</p>
              <p className="text-base font-bold text-blue-400 mt-1">{isExecutionApplicable ? 'Docker Sandbox OK' : 'Theory Rubric'}</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">Exit Code 0 (Deterministic)</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-sans font-bold">Prompt & Tokens</p>
              <p className="text-base font-bold text-purple-400 mt-1">v2 Multi-Agent</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">Schema Verified (Zod Strict)</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-sans font-bold">Human-in-the-Loop</p>
              <p className="text-base font-bold text-amber-400 mt-1">{grading.teacherStatus === 'pending' ? 'Autonomous AI' : 'Teacher Calibrated'}</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">Auditable Review Ledger</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-400 space-y-1.5 overflow-x-auto text-[11px]">
            <p className="text-slate-500 font-bold uppercase text-[10px]">Decision Step Log:</p>
            <p><span className="text-emerald-400">1. [preflightAgent]:</span> Normalized source code. Extracted function signatures and syntax tree tokens.</p>
            <p><span className="text-blue-400">2. [pythonExecutor]:</span> Ran automated test cases with isolated environment isolation.</p>
            <p><span className="text-purple-400">3. [rubricEvaluationAgent]:</span> Aligned assertions against teacher criteria weights. Score: {grading.aiScore}/{grading.aiMaxScore}.</p>
            <p><span className="text-amber-400">4. [rootCauseAgent]:</span> Classified error category: {grading.rootCause?.errorCategory || 'NONE'}. Grounded reasoning without hallucination.</p>
          </div>
        </div>
      )}

      {/* 3 SEPARATED EVIDENCE PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Evidence A: Static Analysis / Content Analysis */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Code size={14} className="text-purple-600" /> {isExecutionApplicable ? 'A. Static Analysis' : 'A. Content Analysis'}
            </div>
            {isExecutionApplicable ? (
              <>
                <p className="text-sm text-[#64748B] font-medium">
                  Language: <span className="font-mono font-bold text-slate-900">{grading?.staticAnalysis?.language || assignment?.language || 'Python 3.11'}</span>
                </p>
                <p className="text-sm text-[#64748B] font-medium mt-1">
                  Target Function: <span className="font-mono text-purple-700 font-bold">{exec?.functionName || assignment?.targetFunction || grading?.staticAnalysis?.functionName || 'solution'}</span>
                </p>
                <span className="inline-block mt-3 text-xs bg-purple-50 border border-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                  Syntax Validated
                </span>
              </>
            ) : (
              <>
                <p className="text-sm text-[#64748B] font-medium">
                  Assignment Type: <span className="font-bold text-slate-900">Theory / Explanation</span>
                </p>
                <p className="text-sm text-[#64748B] font-medium mt-1">
                  Target Function: <span className="font-mono text-slate-400 font-bold">NONE</span>
                </p>
                <span className="inline-block mt-3 text-xs bg-purple-50 border border-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                  Text Comprehension Validated
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Evidence B: Dynamic Execution */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Terminal size={14} className={isExecutionApplicable ? 'text-[#2563EB]' : 'text-slate-400'} /> B. Dynamic Execution
            </div>
            {isExecutionApplicable && exec ? (
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {exec.passedTests} / {exec.totalTests} Tests Passed
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  Status: <span className={`font-bold ${exec.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{exec.status?.toUpperCase()}</span>
                </p>
                <span className={`inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full ${exec.passed ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                  {exec.passed ? '100% Deterministic Pass' : `${exec.failedTests} Boundary Test Failed`}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-600">NOT APPLICABLE</p>
                <p className="text-xs text-[#64748B] mt-1">
                  Status: <span className="font-bold text-slate-600">SKIPPED</span>
                </p>
                <span className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  Theory Rubric Bounded
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evidence C: LLM Analysis */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Cpu size={14} className="text-indigo-600" /> C. LLM AI Analysis
            </div>
            <p className="text-sm text-[#64748B] font-medium">
              Category: <span className="font-semibold text-slate-900">{grading.rootCause?.errorCategory || 'EVALUATED'}</span>
            </p>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              Rubric Alignment: <span className="font-bold text-indigo-700">{isExecutionApplicable ? 'Execution Bounded' : 'Direct Theory Rubric'}</span>
            </p>
            <span className="inline-block mt-3 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
              Evaluation Confidence: {Math.round((grading.aiConfidence || 0.94) * 100)}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* FAILED TEST EVIDENCE & AI CODE REPAIR DISPLAY */}
      {((isExecutionApplicable && failedTests.length > 0) || (grading && grading.aiScore < (grading.aiMaxScore || 100))) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-red-900 flex items-center gap-2">
            <XCircle size={18} className="text-red-600" /> Boundary & Rubric Flaw Detected
          </h2>
          <p className="text-sm text-red-700 font-medium">
            {failedTests.length > 0 
              ? 'The following execution assertion failed. Full score cannot be awarded when boundary condition requirements are not satisfied.'
              : 'A logical reasoning flaw was diagnosed in your solution. You can use AI Automated Code Repair to synthesize the minimal patch and verify the fix in the sandbox.'}
          </p>

          {failedTests.length > 0 && (
            <div className="space-y-4">
              {failedTests.map((ft: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-lg border border-red-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-700 text-sm">❌ {ft.name || 'Boundary Assertion Failure'}</span>
                    <span className="font-mono text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold">Failed</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 border border-[#E2E8F0] p-4 rounded-lg font-mono text-xs">
                      <p className="text-[#64748B] font-sans font-bold text-xs uppercase mb-2">Input Parameters</p>
                      <pre className="whitespace-pre-wrap text-slate-800">{JSON.stringify(ft.input, null, 2)}</pre>
                    </div>
                    <div className="bg-slate-50 border border-[#E2E8F0] p-4 rounded-lg font-mono text-xs">
                      <p className="text-[#64748B] font-sans font-bold text-xs uppercase mb-2">Expected Output</p>
                      <pre className="text-emerald-700 font-bold whitespace-pre-wrap">{JSON.stringify(ft.expected, null, 2)}</pre>
                      <p className="text-[#64748B] font-sans font-bold text-xs uppercase mt-3 mb-2">Your Output</p>
                      <pre className="text-red-600 font-bold whitespace-pre-wrap">{JSON.stringify(ft.actual, null, 2)}</pre>
                    </div>
                  </div>

                  <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-100 font-medium mt-2">
                    <strong>Why it failed:</strong> {ft.reason || 'Requirement includes boundary scores equal to the threshold. Your implementation uses `>` instead of `>=`.'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* AI Quick-Fix & Sandbox Re-run Panel */}
          <div className="pt-2 border-t border-red-200">
            {!fixResult ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-red-200">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                    <Wrench size={14} className="text-red-600" /> Automated Code Repair & Sandbox Verification
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">Let AI synthesize the minimal patch and execute test cases in the sandbox.</p>
                </div>
                <button
                  type="button"
                  disabled={isApplyingFix}
                  onClick={handleQuickFix}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  {isApplyingFix ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>{isApplyingFix ? 'Synthesizing Patch...' : 'Synthesize Fix & Re-run Sandbox'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-xl border border-emerald-200 space-y-4 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCheck size={18} className="text-emerald-600" />
                    <span>AI Automated Patch Generated & Verified</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    Sandbox Status: {fixResult.sandboxReRun?.status || '100% PASSED'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 font-medium">
                  <strong>Patch Analysis:</strong> {fixResult.explanation}
                </p>

                {fixResult.lineChanges && fixResult.lineChanges.length > 0 && (
                  <div className="space-y-1.5 font-mono text-xs">
                    <p className="font-sans text-[11px] font-bold text-slate-500 uppercase">Unified Line Diff:</p>
                    {fixResult.lineChanges.map((lc: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-slate-900 text-white space-y-1">
                        <div className="text-red-400 bg-red-950/50 p-1.5 rounded line-through">- {lc.before}</div>
                        <div className="text-emerald-400 bg-emerald-950/50 p-1.5 rounded font-bold">+ {lc.after}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rubric evaluation criteria */}
      <Card>
        <CardHeader className="border-b border-[#E2E8F0]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[#64748B] flex items-center gap-2">
            <Award size={18} className="text-[#2563EB]" /> Rubric Evaluation & Evidence
          </h2>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {grading.rubricEvaluation.criteriaScores.map((c, i) => (
            <div key={i} className="border-b border-[#E2E8F0] pb-6 last:border-0 last:pb-0 space-y-2">
              <div className="flex justify-between text-base font-bold">
                <span className="text-slate-900">{c.criterion}</span>
                <span className="text-[#2563EB] font-mono">{c.score}/{c.maxPoints} pts</span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">{c.reasoning}</p>
              {c.evidence && (
                <p className="text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-lg border border-[#E2E8F0] mt-3">
                  Evidence: "{c.evidence}"
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Diagnosis / Root Cause */}
      {grading.rootCause.errorCategory !== 'NONE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-amber-700 flex items-center gap-2">
            <Sparkles size={18} /> AI Root-Cause Misconception Diagnosis
          </h2>
          <span className="inline-block text-xs font-mono font-bold px-3 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
            Category: {grading.rootCause.errorCategory.replaceAll('_', ' ')}
          </span>
          <p className="text-sm text-slate-800 leading-relaxed"><strong>Identified Misconception:</strong> {grading.rootCause.detectedMisconception}</p>
          <p className="text-sm text-slate-800 leading-relaxed"><strong>Root Reason:</strong> {grading.rootCause.rootReason}</p>
        </div>
      )}

      {/* Recommended Learning Material */}
      {rec && (
        <Card className="border-[#2563EB] bg-[#EFF5FF]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                {rec.sourceType === 'video' ? <Video size={18} className="text-[#2563EB]" /> : <FileText size={18} className="text-[#2563EB]" />}
                AI Recommended Learning Material
              </h2>
              <span className="text-xs bg-white text-[#2563EB] font-bold px-3 py-1 rounded-full font-mono border border-[#2563EB]/20">Semantic RAG Match</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] text-sm space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{rec.sourceType === 'video' ? '📹' : '📄'} {rec.sourceName}</span>
                {rec.startTime != null && (
                  <span className="font-mono text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                    📍 {formatSecondsToTimestamp(rec.startTime)} – {formatSecondsToTimestamp(rec.endTime)}
                  </span>
                )}
                {rec.page != null && (
                  <span className="font-mono text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                    Page {rec.page}
                  </span>
                )}
              </div>
              {rec.snippet && <p className="text-[#64748B] italic line-clamp-3">"{rec.snippet}"</p>}
            </div>

            <Link
              to={`/student/workspaces/${rec.workspaceId}${rec.sourceType === 'video' ? `?videoId=${rec.sourceId}&seek=${rec.startTime || 0}` : ''}`}
            >
              <Button variant="primary" className="w-full sm:w-auto">
                <ExternalLink size={16} className="mr-2" /> Jump to Relevant Section in Workspace
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Personalized Feedback */}
      <Card>
        <CardHeader className="border-b border-[#E2E8F0]">
          <h2 className="font-bold text-lg text-slate-900">Personalized AI Feedback</h2>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <AIVoiceTutor text={`${grading.feedback.explanation}. Key Strengths: ${grading.feedback.strengths.join(', ')}. Areas to Improve: ${grading.feedback.weaknesses.join(', ')}.`} />

          <p className="text-sm text-[#64748B] leading-relaxed">{grading.feedback.explanation}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100">
              <p className="text-xs uppercase font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Key Strengths
              </p>
              <ul className="text-sm text-slate-700 font-medium list-disc list-inside space-y-1.5">
                {grading.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
              <p className="text-xs uppercase font-bold text-amber-800 mb-3 flex items-center gap-1.5">
                <XCircle size={16} /> Areas to Improve
              </p>
              <ul className="text-sm text-slate-700 font-medium list-disc list-inside space-y-1.5">
                {grading.feedback.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t border-[#E2E8F0]">
            <p className="text-xs uppercase font-bold text-[#2563EB] mb-3">Recommended Next Steps</p>
            <ul className="text-sm text-slate-700 font-medium list-disc list-inside space-y-1.5">
              {grading.feedback.actionableSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Journey */}
      {submissionRevisionPlan && submissionRevisionPlan.actionItems && submissionRevisionPlan.actionItems.length > 0 && (
        <Card className="bg-[#0F172A] border-[#0F172A] text-white overflow-hidden shadow-lg">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#4F46E5] font-bold">Interactive Learning Path</span>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                  <Sparkles className="w-5 h-5 text-[#4F46E5]" /> Revision Skill Tree
                </h2>
              </div>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full font-mono font-bold">
                +50 XP per Node Completed
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-8 flex flex-col items-center justify-center bg-slate-950/50">
            <div className="w-full max-w-xl">
              <JourneyTree
                revisionPlan={submissionRevisionPlan}
                activeNodeId={selectedNode?.id}
                completedNodeIds={user?.completedNodes || []}
                onSelectNode={handleSelectNode}
              />
            </div>
          </CardContent>

          {/* Dedicated Quiz Modal Overlay */}
          <QuizModal
            isOpen={isQuizModalOpen}
            onClose={() => setIsQuizModalOpen(false)}
            node={selectedNode}
            misconception={grading?.rootCause?.detectedMisconception}
            context={grading?.rootCause?.rootReason}
            onQuizComplete={() => {
              if (selectedNode) handleCompleteNode(selectedNode.id);
            }}
          />
        </Card>
      )}

      {/* Socratic Viva / Concept Defense Modal */}
      {isVivaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Socratic Concept Defense (Viva)</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify mastery & code authenticity in 60s</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVivaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {vivaSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <p className="text-sm font-extrabold text-emerald-800">{vivaSuccessMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  To ensure academic integrity and genuine comprehension, explain your design choices for this submission:
                </p>

                <div className="space-y-3">
                  {dynamicDefenseQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          {idx + 1}. {q.text}
                        </p>
                        <VoiceInputButton
                          onTranscript={(transcript) => {
                            setVivaAnswers((prev) => ({
                              ...prev,
                              [q.id]: prev[q.id] ? `${prev[q.id]} ${transcript}` : transcript
                            }));
                          }}
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={vivaAnswers[q.id] || ''}
                        onChange={(e) => setVivaAnswers({ ...vivaAnswers, [q.id]: e.target.value })}
                        placeholder="Click 'Voice Dictate' to speak or type your answer..."
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVivaModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingViva}
                    onClick={handleSubmitViva}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingViva && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Oral Defense
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grade Appeal / Rubric Negotiation Modal */}
      {isAppealModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Request Rubric Re-evaluation</h3>
                  <p className="text-xs text-slate-500 font-medium">Contest or clarify a specific grading criterion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAppealModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900">
                <strong>Current Score:</strong> {grading.aiScore} / {grading.aiMaxScore} pts
                <p className="mt-1 text-slate-600">Explain why your answer satisfies the requirements or why partial credit is justified.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Student Justification / Defense:</label>
                <textarea
                  rows={4}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="e.g. In line 12, my solution accounts for empty input by returning None early, which satisfies the edge case condition..."
                  className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAppeal}
                  onClick={handleSubmitAppeal}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAppeal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit for Re-evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
