import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Plus, Users, BookOpen, ChevronRight, Sparkles, FolderPlus, Lightbulb, Clock, CheckCircle2, AlertTriangle, ArrowRight, X, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<any | null>(null);
  const [strategyStats, setStrategyStats] = useState<any | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await api.get('/classes');
      const list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);
      setClasses(list);
    } catch (e) {
      console.error(e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStrategy = async () => {
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const res = await api.post('/submissions/teacher-review-strategy');
      setStrategy(res.data?.reTeachPlan);
      setStrategyStats(res.data?.stats);
    } catch (err: any) {
      console.error('Error generating strategy:', err);
      setStrategyError(err.response?.data?.message || 'Failed to generate review strategy. Please try again.');
    } finally {
      setStrategyLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalStudents = (classes || []).reduce((acc, c) => acc + (c.students?.length || c.studentIds?.length || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Teacher Dashboard
          </h1>
          <p className="text-[#64748B] text-sm mt-1">Manage classrooms, create rubric assignments, and review AI submissions.</p>
        </div>
        <Link to="/teacher/classes">
          <Button variant="primary">
            <Plus size={16} className="mr-1.5" /> Create New Class
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <CardContent className="flex flex-col justify-center h-full p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Total Classes</p>
            <p className="text-3xl font-bold text-slate-900">{(classes || []).length}</p>
            <p className="text-xs font-medium text-[#64748B] mt-1">Active learning cohorts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col justify-center h-full p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Enrolled Students</p>
            <p className="text-3xl font-bold text-slate-900">{totalStudents}</p>
            <p className="text-xs font-medium text-[#64748B] mt-1">Students across all classes</p>
          </CardContent>
        </Card>

        <Card className="bg-[#F8FAFC]">
          <CardContent className="flex flex-col justify-center h-full p-6 space-y-3">
            <Link to="/teacher/classes">
              <Button variant="primary" className="w-full justify-center">Create Assignment Rubric</Button>
            </Link>
            <Link to="/teacher/submissions">
              <Button variant="secondary" className="w-full justify-center">Review AI Submissions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* AI Class Insights & Review Strategy Card */}
      <Card className="border-[#2563EB]/20 bg-[#EFF5FF] overflow-hidden transition-all shadow-sm">
        <CardHeader className="pb-3 border-b-0">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb size={18} className="text-[#2563EB]" /> AI Class Insights & Review Strategy
            </h2>
            <span className="text-xs font-semibold bg-blue-100 text-[#2563EB] px-2 py-0.5 rounded-full">AI Powered</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!strategy ? (
            <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-slate-900">Generate Data-Driven Review Strategies</p>
                <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                  Use your students' recent submission data, rubrics, and identified misconceptions to instantly synthesize a targeted 15-minute re-teaching plan for your next class.
                </p>
                {strategyError && (
                  <p className="text-xs text-rose-600 mt-2 font-medium bg-rose-50 border border-rose-200 inline-block px-2.5 py-1 rounded">
                    {strategyError}
                  </p>
                )}
              </div>
              <Button 
                variant="primary" 
                className="shrink-0" 
                disabled={strategyLoading}
                onClick={handleGenerateStrategy}
              >
                {strategyLoading ? (
                  <>
                    <RefreshCw size={16} className="mr-1.5 animate-spin" /> Analyzing Class Submissions...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-1.5" /> Generate Review Strategy
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-[#2563EB]/30 shadow-md space-y-5 animate-in fade-in duration-300">
              {/* Strategy Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      <Clock size={12} /> {strategy.durationMinutes || 15} Min Re-Teaching Plan
                    </span>
                    {strategyStats && (
                      <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                        Based on {strategyStats.totalSubmissions} submission{strategyStats.totalSubmissions === 1 ? '' : 's'} • Class Avg: {strategyStats.averageScore}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1.5">{strategy.lessonTitle}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleGenerateStrategy}
                    disabled={strategyLoading}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Regenerate strategy with latest data"
                  >
                    <RefreshCw size={14} className={strategyLoading ? 'animate-spin' : ''} /> Regenerate
                  </button>
                  <button 
                    onClick={() => setStrategy(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Collapse"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Identified Misconceptions / Target Topics */}
              {Array.isArray(strategy.keyMisconceptions) && strategy.keyMisconceptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" /> Focus Misconceptions & Concept Gaps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.keyMisconceptions.map((m: string, idx: number) => (
                      <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200/80 px-3 py-1 rounded-lg text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Micro-Lesson Timeline Steps */}
              {Array.isArray(strategy.microLessonSteps) && strategy.microLessonSteps.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Step-by-Step Lesson Execution
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {strategy.microLessonSteps.map((step: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-all">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                              {step.minuteRange}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">Step {idx + 1}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{step.activity}</h4>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                            <span className="font-semibold text-slate-700 block mb-0.5">Teacher Tip:</span>
                            {step.teacherGuidance}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peer-Tutoring / Collaboration Pairings */}
              {Array.isArray(strategy.peerTutoringPairs) && strategy.peerTutoringPairs.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <Users size={13} className="text-blue-600" /> Recommended Peer-Tutoring & Collaboration Breakout
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {strategy.peerTutoringPairs.map((pair: any, idx: number) => (
                      <div key={idx} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pair.tutorName}</span>
                          <ArrowRight size={12} className="text-blue-500" />
                          <span className="font-medium text-slate-700">{pair.learnerName}</span>
                        </div>
                        <span className="text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded font-medium text-[11px]">
                          {pair.focusConcept}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class List Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-[#64748B]" /> Active Classrooms ({(classes || []).length})
          </h2>
          <Link to="/teacher/classes" className="text-sm font-semibold text-[#2563EB] hover:underline">
            Manage All Classes &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
          </div>
        ) : (classes || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(classes || []).map((c) => {
              const studentCount = (c.students?.length || c.studentIds?.length || 0);
              return (
                <Card key={c._id || c.id} className="flex flex-col h-full hover:border-[#2563EB]/50 hover:shadow-md transition-all group">
                  <CardContent className="h-full flex flex-col p-5">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1">{c.name}</h3>
                      <p className="text-sm text-[#64748B] mt-0.5">{c.subject || 'General Subject'}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                        <span className="bg-slate-100 text-slate-700 border border-[#E2E8F0] px-2.5 py-1 rounded-md font-mono font-medium">
                          Code: {c.joinCode}
                        </span>
                        <span className="text-[#64748B] flex items-center gap-1 font-medium">
                          <Users size={14} /> {studentCount} student{studentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex justify-end">
                      <Link to={`/teacher/classes/${c._id || c.id}`} className="text-sm font-semibold text-[#2563EB] hover:underline flex items-center group-hover:text-blue-700">
                        Manage Classroom <ChevronRight size={16} className="ml-0.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={FolderPlus}
            title="No classes created yet"
            description="Create your first classroom to start inviting students and assigning work."
            action={
              <Link to="/teacher/classes">
                <Button variant="primary">Create Class</Button>
              </Link>
            }
          />
        )}
      </div>

    </div>
  );
}

