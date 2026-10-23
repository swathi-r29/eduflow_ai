import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { CheckCircle2, Clock, Sparkles, User, FileText, Search, ShieldCheck, ChevronRight, X, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function TeacherSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [grading, setGrading] = useState<any>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [calibrating, setCalibrating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/submissions');
      const list = Array.isArray(res.data) ? res.data : (res.data?.submissions || []);
      setSubmissions(list);
    } catch (e) {
      console.error('Error loading submissions:', e);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [checkingStatus, setCheckingStatus] = useState(false);

  const fetchGradingResult = async (submissionId: string) => {
    try {
      const { data } = await api.get(`/submissions/${submissionId}`);
      if (data.gradingResult) {
        setGrading(data.gradingResult);
        setEditScore(data.gradingResult.teacherScore ?? data.gradingResult.aiScore);
        setEditFeedback(data.gradingResult.teacherFeedback ?? data.gradingResult.feedback?.explanation ?? '');
        load();
      }
      return data.gradingResult;
    } catch (err) {
      console.error('Error loading submission detail:', err);
      return null;
    }
  };

  const open = async (s: any) => {
    setSelected(s);
    setGrading(null);
    await fetchGradingResult(s._id);
  };

  useEffect(() => {
    if (!selected || grading) return;

    const interval = setInterval(async () => {
      const result = await fetchGradingResult(selected._id);
      if (result) {
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selected, grading]);

  const calibrate = async (action: 'accept' | 'edit' | 'override') => {
    if (!grading) return;
    setCalibrating(true);
    try {
      await api.post(`/submissions/grading/${grading._id}/calibrate`, {
        action,
        teacherScore: editScore,
        teacherFeedback: editFeedback
      });
      setSelected(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update grade');
    } finally {
      setCalibrating(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const title = typeof s.assignment === 'object' && s.assignment ? s.assignment.title : 'Assignment';
    const studentName = s.studentName || s.student?.name || (s.rollNumber ? `Roll: ${s.rollNumber}` : 'Student');
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          studentName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'EVALUATED') return s.status === 'ai_evaluated' || s.status === 'teacher_reviewed';
    if (statusFilter === 'PENDING') return s.status === 'submitted' || s.status === 'pending' || s.status === 'ai_processing';
    return true;
  });

  const filterTabs = [
    { key: 'ALL', label: `All (${submissions.length})` },
    { key: 'EVALUATED', label: 'Evaluated' },
    { key: 'PENDING', label: 'Pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Submissions</h1>
          <p className="text-[#64748B] text-sm mt-1">Review AI evaluation scores, inspect evidence, and calibrate grades.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] text-sm font-medium">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === tab.key ? 'bg-white shadow-sm text-slate-900 font-semibold border border-[#E2E8F0]' : 'text-[#64748B] hover:text-slate-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by student name, roll number, or assignment title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field !pl-10 py-2.5 text-sm"
        />
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
          </div>
        ) : filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((s) => {
            const title = typeof s.assignment === 'object' && s.assignment ? s.assignment.title : 'Assignment';
            const studentName = s.studentName || s.student?.name || (s.rollNumber ? `Roll: ${s.rollNumber}` : 'Student');
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

            return (
              <button
                key={s._id}
                onClick={() => open(s)}
                className="w-full text-left bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-[#2563EB]/50 hover:shadow-md transition-all group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{title}</span>
                    {s.isPublicSubmission && (
                      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium px-2 py-0.5 rounded-full">
                        Public Portal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#64748B] font-medium">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <User size={13} className="text-[#2563EB]" /> {studentName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {s.status === 'ai_evaluated' || s.status === 'teacher_reviewed' ? (
                    <Badge status="submitted">
                      <CheckCircle2 size={13} className="mr-1" /> Evaluated
                    </Badge>
                  ) : s.status === 'ai_processing' ? (
                    <Badge status="processing">
                      <Sparkles size={13} className="mr-1" /> AI Processing
                    </Badge>
                  ) : (
                    <Badge status="pending">
                      <Clock size={13} className="mr-1" /> Submitted
                    </Badge>
                  )}
                  <span className="text-sm font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform flex items-center">
                    Review <ChevronRight size={16} />
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <EmptyState
            icon={FileText}
            title="No submissions found"
            description="Submissions will appear here once students submit their assignments via student dashboard or public portal."
          />
        )}
      </div>

      {/* Evaluation & Calibration Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <CardHeader className="border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Student Submission Review</span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {typeof selected.assignment === 'object' && selected.assignment ? selected.assignment.title : 'Assignment Submission'}
                </h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Submitted by: <strong className="text-slate-900">{selected.studentName || selected.student?.name || (selected.rollNumber ? `Roll: ${selected.rollNumber}` : 'Student')}</strong>
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-[#64748B] hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {/* Answer Content */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Student Answer Text</label>
                <div className="bg-slate-50 border border-[#E2E8F0] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-800">
                  {selected.answerText}
                </div>
              </div>

              {/* AI Grading Results */}
              {!grading ? (
                <div className="py-8 text-center space-y-3 bg-blue-50/80 rounded-xl border border-blue-100 p-6">
                  <Sparkles className="w-8 h-8 text-[#2563EB] animate-spin mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">AI evaluation is in progress...</p>
                    <p className="text-xs text-blue-700/80 mt-1 max-w-sm mx-auto">
                      The multi-agent pipeline is scoring your rubric criteria and generating diagnostic feedback. It takes about 10–20 seconds.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={checkingStatus}
                    onClick={async () => {
                      if (!selected) return;
                      setCheckingStatus(true);
                      await fetchGradingResult(selected._id);
                      setCheckingStatus(false);
                    }}
                  >
                    <RefreshCw size={13} className={checkingStatus ? 'animate-spin mr-1.5' : 'mr-1.5'} />
                    {checkingStatus ? 'Checking...' : 'Check Status'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-[#F8FAFC] p-5 rounded-lg border border-[#E2E8F0] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#64748B] uppercase mb-1">AI Evaluated Score</p>
                        <p className="text-2xl font-bold text-[#2563EB]">
                          {grading.aiScore} / {grading.aiMaxScore || 100}
                          <span className="text-sm font-medium text-[#64748B] ml-2">
                            ({Math.round((grading.aiConfidence || 0.94) * 100)}% Confidence)
                          </span>
                        </p>
                      </div>

                      {grading.teacherStatus !== 'pending' && (
                        <Badge status="submitted">
                          Teacher: {grading.teacherStatus?.toUpperCase()} ({grading.teacherScore} pts)
                        </Badge>
                      )}
                    </div>

                    {grading.rootCause?.detectedMisconception && (
                      <div className="text-sm bg-amber-50 text-amber-900 p-4 rounded-lg border border-amber-100 font-medium">
                        <strong>Detected Misconception:</strong> {grading.rootCause.detectedMisconception}
                      </div>
                    )}
                  </div>

                  {/* Rubric Criteria Breakdown */}
                  {grading.rubricEvaluation?.criteriaScores?.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Rubric Criteria Breakdown</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {grading.rubricEvaluation.criteriaScores.map((c: any, idx: number) => (
                          <div key={idx} className="p-4 bg-white rounded-lg border border-[#E2E8F0] text-sm flex justify-between items-start">
                            <div className="flex-1 mr-4">
                              <p className="font-bold text-slate-900">{c.criterion}</p>
                              <p className="text-sm text-[#64748B] mt-0.5">{c.reasoning}</p>
                            </div>
                            <span className="font-mono font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 shrink-0 text-sm">
                              {c.score}/{c.maxPoints}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Calibration Form */}
                  <div className="bg-white border border-[#2563EB]/20 rounded-lg p-5 space-y-4">
                    <h3 className="text-sm font-bold text-[#2563EB] flex items-center gap-2">
                      <ShieldCheck size={16} /> Teacher Grade Calibration & Feedback
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Final Teacher Score</label>
                        <input
                          type="number"
                          className="input-field font-bold"
                          value={editScore}
                          onChange={(e) => setEditScore(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1.5">Teacher Feedback / Explanation</label>
                      <textarea
                        rows={3}
                        className="input-field"
                        value={editFeedback}
                        onChange={(e) => setEditFeedback(e.target.value)}
                        placeholder="Add custom notes or instructions for the student..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-[#E2E8F0]">
                      <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                      <Button variant="secondary" onClick={() => calibrate('accept')} disabled={calibrating}>
                        Accept AI Score
                      </Button>
                      <Button variant="primary" onClick={() => calibrate('edit')} disabled={calibrating}>
                        Save Edited Grade
                      </Button>
                      <Button variant="primary" className="bg-amber-600 hover:bg-amber-700 border-amber-700" onClick={() => calibrate('override')} disabled={calibrating}>
                        Override Grade
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
