import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Plus, Trash2, BookOpen, Users } from 'lucide-react';
import type { RubricCriterion } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]);
  const [creatingClass, setCreatingClass] = useState(false);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [sampleSolution, setSampleSolution] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [rubric, setRubric] = useState<RubricCriterion[]>([{ criterion: '', maxPoints: 25, description: '' }]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/classes');
      const list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);
      setClasses(list);
    } catch (e) {
      setClasses([]);
    }
  };
  useEffect(() => { load(); }, []);

  const createClass = async () => {
    if (!className.trim()) return;
    await api.post('/classes', { name: className, subject });
    setClassName(''); setSubject(''); setCreatingClass(false);
    load();
  };

  const [errorMsg, setErrorMsg] = useState('');

  const updateRubric = (i: number, field: keyof RubricCriterion, value: string | number) => {
    setRubric((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const createAssignment = async () => {
    setSavedMsg('');
    setErrorMsg('');
    if (!selectedClass) {
      setErrorMsg('Please select a class first.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title.');
      return;
    }
    if (!question.trim()) {
      setErrorMsg('Please enter the question content.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/assignments', {
        classId: selectedClass, title, question, sampleSolution, maxScore,
        rubric: rubric.filter((r) => r.criterion.trim())
      });
      setSavedMsg('Assignment created successfully!');
      setTitle(''); setQuestion(''); setSampleSolution('');
      setRubric([{ criterion: '', maxPoints: 25, description: '' }]);
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classes</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your classrooms and create assignments.</p>
        </div>
        <Button variant="primary" onClick={() => setCreatingClass(true)}>
          <Plus size={16} className="mr-1.5" /> New Class
        </Button>
      </div>

      {/* Create Class Modal */}
      {creatingClass && (
        <Card className="max-w-md">
          <CardHeader className="border-b border-[#E2E8F0]">
            <h2 className="font-bold text-slate-900">Create New Class</h2>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Class Name</label>
              <input className="input-field" placeholder="e.g. CS101 - Intro to Programming" value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Subject</label>
              <input className="input-field" placeholder="e.g. Computer Science" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setCreatingClass(false)}>Cancel</Button>
              <Button variant="primary" onClick={createClass}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Cards */}
      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => (
            <Card key={c._id} className="hover:border-[#2563EB]/50 hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{c.name}</h3>
                    <p className="text-sm text-[#64748B] mt-0.5">{c.subject || 'General'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-[#E2E8F0] px-2 py-1 rounded-md">
                        Code: {c.joinCode}
                      </span>
                      <span className="text-xs text-[#64748B] flex items-center gap-1">
                        <Users size={12} /> {c.students?.length || c.studentIds?.length || 0} students
                      </span>
                      {((c.joinRequests || []).filter((r: any) => r.status === 'pending')).length > 0 && (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                          {(c.joinRequests || []).filter((r: any) => r.status === 'pending').length} pending req
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/teacher/classes/${c._id}`}>
                    <Button variant="secondary" size="sm">Manage</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="Create your first class to get started."
        />
      )}

      {/* Create Assignment Form */}
      <Card>
        <CardHeader className="border-b border-[#E2E8F0]">
          <h2 className="font-bold text-slate-900">Create Assignment with Rubric</h2>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Class</label>
              <select className="input-field" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Title</label>
              <input className="input-field" placeholder="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Question</label>
            <textarea className="input-field h-24" placeholder="Enter the assignment question or prompt..." value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sample Solution <span className="text-[#64748B] font-normal">(optional, helps grading accuracy)</span></label>
            <textarea className="input-field h-20" placeholder="Provide a sample solution..." value={sampleSolution} onChange={(e) => setSampleSolution(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Max Score</label>
            <input type="number" className="input-field w-32" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Rubric Criteria</label>
            <div className="flex gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 px-0.5">
              <span className="flex-1">Criterion Name</span>
              <span className="w-28">Points</span>
              <span className="w-8"></span>
            </div>
            <div className="space-y-3">
              {rubric.map((r, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <input
                      className="input-field"
                      placeholder="Criterion name (e.g., OOP Design, Logic & Correctness)"
                      value={r.criterion}
                      onChange={(e) => updateRubric(i, 'criterion', e.target.value)}
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      className="input-field"
                      placeholder="Points"
                      value={r.maxPoints}
                      onChange={(e) => updateRubric(i, 'maxPoints', Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRubric((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-600 transition-colors shrink-0"
                    title="Remove criterion"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setRubric((prev) => [...prev, { criterion: '', maxPoints: 10 }])}>
              <Plus size={14} className="mr-1" /> Add Criterion
            </Button>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-3">
            <Button variant="primary" onClick={createAssignment} disabled={saving}>
              {saving ? 'Saving...' : 'Create Assignment'}
            </Button>
            {savedMsg && <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>}
            {errorMsg && <span className="text-sm text-red-600 font-medium">{errorMsg}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
