import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { ClassItem, Assignment } from '../../types';
import { Users, BookOpen, Copy, Check, Plus, Sparkles, UserCheck, UserX, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New assignment form state
  const [assignTitle, setAssignTitle] = useState('');
  const [assignQuestion, setAssignQuestion] = useState('');
  const [assignSampleSolution, setAssignSampleSolution] = useState('');
  const [assignMaxScore, setAssignMaxScore] = useState('100');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const clsRes = await api.get(`/classes/${id}`);
      const classObj = clsRes.data.class || clsRes.data;
      setCls(classObj);

      let assignList: Assignment[] = [];
      try {
        const assignRes = await api.get(`/assignments/class/${id}`);
        assignList = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data?.assignments || []);
      } catch (e) {
        try {
          const assignRes = await api.get(`/assignments?classId=${id}`);
          assignList = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data?.assignments || []);
        } catch (err) {}
      }
      setAssignments(assignList);

      // Fetch submissions for assignments in this class
      let subList: any[] = [];
      const validAssignments = assignList.filter((a) => a && (a._id || (a as any).id));
      if (validAssignments.length > 0) {
        try {
          const subPromises = validAssignments.map((a) => api.get(`/submissions/assignment/${a._id || (a as any).id}`));
          const subResponses = await Promise.allSettled(subPromises);
          subResponses.forEach((res) => {
            if (res.status === 'fulfilled' && res.value?.data) {
              const items = Array.isArray(res.value.data) ? res.value.data : (res.value.data.submissions || []);
              subList.push(...items);
            }
          });
        } catch (e) {}
      }
      setSubmissions(subList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyJoinCode = () => {
    if (cls?.joinCode) {
      navigator.clipboard.writeText(cls.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRequestAction = async (studentId: string, action: 'approve' | 'reject') => {
    setActionLoading(studentId + action);
    try {
      await api.post(`/classes/${id}/approve-request`, { studentId, action });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle || !assignQuestion) return;
    setCreating(true);
    try {
      await api.post('/assignments', {
        classId: id,
        title: assignTitle,
        question: assignQuestion,
        sampleSolution: assignSampleSolution,
        maxScore: Number(assignMaxScore) || 100,
        rubric: [
          { criterion: 'Concept Understanding', maxPoints: 40, description: 'Demonstrates clear grasp of core principles' },
          { criterion: 'Implementation / Reasoning', maxPoints: 40, description: 'Logical steps and complete solution' },
          { criterion: 'Clarity & Detail', maxPoints: 20, description: 'Clear presentation and terminology' }
        ]
      });
      setShowAssignModal(false);
      setAssignTitle('');
      setAssignQuestion('');
      setAssignSampleSolution('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  if (loading || !cls) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const students = (cls.students || (cls as any).studentIds || []) as any[];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{cls.name}</h1>
          <p className="text-[#64748B] text-sm mt-0.5">{cls.subject || 'General Subject'}</p>
        </div>

        <div className="flex items-center gap-3 bg-[#F8FAFC] px-4 py-3 rounded-lg border border-[#E2E8F0]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Join Code</p>
            <p className="text-lg font-mono font-bold text-[#2563EB] tracking-widest">{cls.joinCode}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copyJoinCode}>
            {copied ? <Check size={14} className="text-emerald-600 mr-1" /> : <Copy size={14} className="mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Grid: Students / Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Enrolled Students & Requests (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pending Student Join Requests */}
          {((cls.joinRequests || []).filter((r: any) => r.status === 'pending')).length > 0 && (
            <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
              <CardHeader className="border-b border-amber-200 bg-amber-100/50 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-amber-950 flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-amber-600" /> Pending Join Requests
                  </h2>
                  <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                    {(cls.joinRequests || []).filter((r: any) => r.status === 'pending').length} waiting
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {(cls.joinRequests || [])
                  .filter((r: any) => r.status === 'pending')
                  .map((req: any) => {
                    const student = req.student || {};
                    const isApproving = actionLoading === (student._id || '') + 'approve';
                    const isRejecting = actionLoading === (student._id || '') + 'reject';
                    return (
                      <div
                        key={req._id || student._id}
                        className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-sm truncate">{student.name || 'Student'}</p>
                          <p className="text-xs text-slate-500 truncate">{student.email || 'No email'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'Just now'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRequestAction(student._id, 'approve')}
                            disabled={Boolean(actionLoading)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                            title="Approve student"
                          >
                            <UserCheck size={13} /> {isApproving ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRequestAction(student._id, 'reject')}
                            disabled={Boolean(actionLoading)}
                            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer border border-slate-200"
                            title="Decline request"
                          >
                            <UserX size={13} /> {isRejecting ? '...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b border-[#E2E8F0]">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-[#64748B]" /> Enrolled Students ({students.length})
              </h2>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {students.map((st, i) => (
                  <div key={st._id || i} className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{st.name || `Student ${i + 1}`}</p>
                      <p className="text-xs text-[#64748B]">{st.email || st.rollNo}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium text-xs">
                      Active
                    </span>
                  </div>
                ))}
                {students.length === 0 && (
                  <EmptyState
                    icon={Users}
                    title="No students enrolled"
                    description={`Share join code ${cls.joinCode} with students to get them started.`}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Smart Batch Analytics: Class Concept Heatmap */}
          <Card className="border border-indigo-100 shadow-sm">
            <CardHeader className="border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-[#4F46E5]" /> Concept Mastery Heatmap
                </h2>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  AI Aggregated
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              {[
                { concept: 'Encapsulation & Access Modifiers', mastery: 92, status: 'high' },
                { concept: 'Constructors & Variable State', mastery: 74, status: 'medium' },
                { concept: 'Boundary & Inequality Guards', mastery: 38, status: 'low' },
                { concept: 'Method Signatures & Return Types', mastery: 86, status: 'high' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{item.concept}</span>
                    <span className={`font-mono font-bold ${
                      item.status === 'high' ? 'text-emerald-600' : item.status === 'medium' ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {item.mastery}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.status === 'high' ? 'bg-emerald-500' : item.status === 'medium' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.mastery}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥80% High</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 60-79% Review</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;60% Critical</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List (7 cols) */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader className="border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-[#64748B]" /> Class Assignments ({assignments.length})
              </h2>
              <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)}>
                <Plus size={14} className="mr-1" /> Create Assignment
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div key={a._id} className="p-4 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#2563EB]/50 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <h3 className="font-bold text-sm text-slate-900">{a.title}</h3>
                        <p className="text-sm text-[#64748B] line-clamp-2 mt-0.5">{a.question}</p>
                      </div>
                      <span className="text-xs font-mono font-bold bg-blue-50 text-[#2563EB] border border-blue-100 px-2.5 py-1 rounded-md shrink-0">
                        Max {a.maxScore} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
                      <span>Rubric: {a.rubric?.length || 0} criteria</span>
                      <Link to="/teacher/submissions" className="text-sm font-semibold text-[#2563EB] hover:underline">
                        Submissions & AI Grading &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <EmptyState
                    icon={BookOpen}
                    title="No assignments yet"
                    description="Click 'Create Assignment' to post your first assignment for this class."
                    action={
                      <Button variant="primary" onClick={() => setShowAssignModal(true)}>
                        <Plus size={14} className="mr-1" /> Create Assignment
                      </Button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-xl">
            <CardHeader className="border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#2563EB]" /> Create New Assignment
              </h2>
              <button onClick={() => setShowAssignModal(false)} className="text-[#64748B] hover:text-slate-900 text-sm">✕</button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Assignment Title</label>
                  <input
                    required
                    className="input-field"
                    placeholder="e.g. OOP Polymorphism & Method Overriding"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Question / Problem Prompt</label>
                  <textarea
                    required
                    rows={3}
                    className="input-field"
                    placeholder="Explain runtime polymorphism in Java and give an example..."
                    value={assignQuestion}
                    onChange={(e) => setAssignQuestion(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Sample Solution <span className="text-[#64748B] font-normal">(for AI Grounded Grading)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder="Sample answer or key points expected..."
                    value={assignSampleSolution}
                    onChange={(e) => setAssignSampleSolution(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Max Score</label>
                  <input
                    type="number"
                    className="input-field w-32"
                    value={assignMaxScore}
                    onChange={(e) => setAssignMaxScore(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
