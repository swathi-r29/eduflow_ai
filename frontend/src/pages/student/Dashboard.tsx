import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { ClassItem } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  UserPlus,
  BookOpen,
  Sparkles,
  Flame,
  Target,
  BookMarked,
  ChevronRight,
  BarChart3,
  Clock,
  Check,
  Search,
  X,
  Users,
  Send
} from 'lucide-react';

import StreakCalendar from '../../components/common/StreakCalendar';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassItem[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTab, setJoinTab] = useState<'list' | 'code'>('list');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [requestingClassId, setRequestingClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (user) {
      try {
        let progData = null;
        try {
          const res = await api.get(`/progress/${user.id}`);
          progData = res.data;
        } catch (e) {
          try {
            const res = await api.get(`/analytics/student/${user.id}`);
            progData = res.data;
          } catch (err) {}
        }

        let classesList: ClassItem[] = [];
        let subResList: any[] = [];

        try {
          const classRes = await api.get('/classes');
          classesList = classRes.data.classes || classRes.data || [];
        } catch (e) {}

        try {
          const subRes = await api.get('/submissions');
          subResList = subRes.data.submissions || subRes.data || [];
        } catch (e) {}

        setProgress(progData);
        setEnrolledClasses(classesList);
        setSubmissions(subResList);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinMsg(null);
    try {
      const { data } = await api.post('/classes/join', { joinCode: joinCode.trim() });
      setJoinMsg({ type: 'success', text: `Successfully joined ${data.class?.name || 'class'}!` });
      setJoinCode('');
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinMsg(null);
      }, 1500);
      loadData();
    } catch (err: any) {
      setJoinMsg({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Invalid join passcode.' });
    } finally {
      setJoining(false);
    }
  };

  const loadAvailableClasses = async () => {
    setLoadingAvailable(true);
    try {
      const res = await api.get('/classes/available');
      setAvailableClasses(res.data.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const openJoinModal = () => {
    setShowJoinModal(true);
    setJoinMsg(null);
    setJoinTab('list');
    loadAvailableClasses();
  };

  const handleRequestJoin = async (classId: string) => {
    setRequestingClassId(classId);
    setJoinMsg(null);
    try {
      const res = await api.post(`/classes/${classId}/request-join`);
      setJoinMsg({ type: 'success', text: res.data.message || 'Request sent! Your teacher will review it.' });
      setAvailableClasses((prev) =>
        prev.map((c) => (c._id === classId ? { ...c, isPending: true } : c))
      );
    } catch (err: any) {
      setJoinMsg({
        type: 'error',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to send join request'
      });
    } finally {
      setRequestingClassId(null);
    }
  };

  // Find lowest mastery concept for recommendation
  const lowestConcept = progress?.concepts?.length 
    ? [...progress.concepts].sort((a, b) => a.masteryScore - b.masteryScore)[0] 
    : null;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back 👋, {user?.name}
          </h1>
          <p className="text-[#64748B] text-sm mt-1">Here is a summary of your AI-assisted learning journey.</p>
        </div>
        <Button onClick={openJoinModal}>
          <UserPlus size={16} /> Join Class
        </Button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col justify-center h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Overall Mastery</p>
            <p className="text-3xl font-bold text-slate-900">{progress?.overallMastery ?? '—'}%</p>
            <p className="text-xs font-medium text-[#64748B] mt-1">{progress?.overallLevel ?? 'No evaluation data yet'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col justify-center h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Concepts Tracked</p>
            <p className="text-3xl font-bold text-slate-900">{progress?.concepts?.length ?? 0}</p>
            <p className="text-xs font-medium text-[#64748B] mt-1">Active prerequisite mapping</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex flex-col justify-center h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Assignments</p>
            <p className="text-3xl font-bold text-slate-900">{submissions.length}</p>
            <Link to="/student/assignments" className="text-xs font-medium text-[#2563EB] mt-1 hover:underline inline-flex items-center">
              View all <ChevronRight size={14}/>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#F8FAFC]">
          <CardContent className="flex flex-col justify-center h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Learning Streak</p>
            <div className="flex items-center gap-2">
              <Flame className="text-[#F59E0B]" size={28} />
              <p className="text-3xl font-bold text-slate-900">{user?.streak || progress?.streakCount || (submissions.length > 0 ? 1 : 0)}</p>
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">Days active</p>
          </CardContent>
        </Card>
      </div>

      {/* EduFlow AI Recommendation */}
      <Card className="border-[#2563EB]/20 bg-[#EFF5FF]">
        <CardHeader className="pb-3 border-b-0">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-[#2563EB]" /> EduFlow AI Recommendation
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          {lowestConcept ? (
             <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                 <p className="text-sm font-semibold text-slate-900">Review Recommended: {lowestConcept.concept}</p>
                 <p className="text-xs text-[#64748B] mt-1">Your mastery score is {lowestConcept.masteryScore}%. The AI suggests reviewing related materials or taking a practice quiz.</p>
               </div>
               <Link to="/student/quiz">
                 <Button variant="primary">Generate Practice Quiz</Button>
               </Link>
             </div>
          ) : (
            <p className="text-sm text-[#64748B] bg-white p-4 rounded-lg border border-[#E2E8F0]">
              Not enough data yet. Complete an assignment or create a workspace to receive AI recommendations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Continue Learning */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BookMarked size={18} className="text-[#64748B]" /> Enrolled Classes
          </h2>
        </div>

        {enrolledClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enrolledClasses.map((cls) => (
              <Card key={cls._id} className="hover:border-[#2563EB]/50 transition-colors">
                <CardContent>
                  <h3 className="font-bold text-sm text-slate-900">{cls.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1">{cls.subject || 'General Subject'}</p>
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                    <span className="text-[#64748B] font-mono text-xs">Code: {cls.joinCode}</span>
                    <Link to={`/student/assignments?classId=${cls._id}`} className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1">
                      View Tasks &rarr;
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={BookOpen}
            title="No Classes Yet"
            description="You have not joined any classes yet. Click 'Join Class' and enter your teacher's 8-character passcode to enroll."
            action={<Button onClick={openJoinModal}>Join Class</Button>}
          />
        )}
      </div>

      {/* Recent Activity / Concept Mastery chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Target size={18} className="text-[#64748B]" /> Concept Mastery Profile
              </h2>
            </CardHeader>
            <CardContent>
              {progress?.concepts?.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progress.concepts} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="concept" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Bar dataKey="masteryScore" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState 
                  icon={BarChart3}
                  title="No Mastery Data"
                  description="Complete an assignment or study quiz to start building your knowledge profile."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <GamificationCard user={user} />
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
            <StreakCalendar streakCount={user?.streak || progress?.streakCount || (submissions.length > 0 ? 1 : 0)} submissions={submissions} />
          </div>
        </div>
      </div>

      {/* Join Class Modal (Browse List + Passcode) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-xl w-full shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Join a Classroom</h2>
                  <p className="text-xs text-[#64748B]">Choose how you want to join your teacher's class</p>
                </div>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#E2E8F0] px-5 bg-white">
              <button
                type="button"
                onClick={() => setJoinTab('list')}
                className={`py-3 px-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  joinTab === 'list'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen size={14} /> Browse Classes & Request
                {availableClasses.length > 0 && (
                  <span className="ml-1 bg-blue-50 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-blue-100">
                    {availableClasses.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setJoinTab('code')}
                className={`py-3 px-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  joinTab === 'code'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Target size={14} /> Join with Passcode
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              {joinMsg && (
                <div
                  className={`text-xs p-3 rounded-xl font-medium border flex items-center gap-2 ${
                    joinMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {joinMsg.type === 'success' ? <Check size={14} className="shrink-0" /> : <X size={14} className="shrink-0" />}
                  <span>{joinMsg.text}</span>
                </div>
              )}

              {/* Tab 1: Browse Class List & Request */}
              {joinTab === 'list' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Search class by name, subject, or teacher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {loadingAvailable ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-slate-500 mt-2">Loading available classes...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {availableClasses
                        .filter((cls) => {
                          const q = searchQuery.toLowerCase();
                          return (
                            (cls.name || '').toLowerCase().includes(q) ||
                            (cls.subject || '').toLowerCase().includes(q) ||
                            (cls.teacher?.name || '').toLowerCase().includes(q)
                          );
                        })
                        .map((cls) => (
                          <div
                            key={cls._id}
                            className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-blue-200 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm text-slate-900 truncate">{cls.name}</h4>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                  {cls.subject || 'General'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Teacher: <span className="text-slate-700 font-medium">{cls.teacher?.name || 'Instructor'}</span>
                                {' · '}
                                <span className="inline-flex items-center gap-0.5">
                                  <Users size={11} /> {cls.studentCount || 0} students
                                </span>
                              </p>
                            </div>

                            <div className="shrink-0">
                              {cls.isEnrolled ? (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                                  <Check size={13} /> Enrolled
                                </span>
                              ) : cls.isPending ? (
                                <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                                  <Clock size={13} className="text-amber-600 animate-spin" /> Pending Approval
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={requestingClassId === cls._id}
                                  onClick={() => handleRequestJoin(cls._id)}
                                >
                                  {requestingClassId === cls._id ? (
                                    'Sending...'
                                  ) : (
                                    <>
                                      <Send size={12} className="mr-1" /> Request to Join
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                      {availableClasses.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                          <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-semibold">No classes available yet</p>
                          <p className="text-xs text-slate-400 mt-0.5">Ask your teacher to create a class.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Join with Passcode */}
              {joinTab === 'code' && (
                <form onSubmit={handleJoinClass} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                      Class Passcode
                    </label>
                    <input
                      required
                      autoFocus
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-center text-xl font-mono uppercase tracking-widest text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#2563EB] transition-all outline-none"
                      placeholder="e.g. DEMO1234"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <p className="text-[11px] text-[#64748B] mt-1.5 text-center">
                      Enter the 8-character passcode provided by your teacher to enroll instantly.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setShowJoinModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={joining}>
                      {joining ? 'Joining...' : 'Enroll with Passcode'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-[#E2E8F0] text-center text-[11px] text-slate-500">
              {joinTab === 'list'
                ? 'Join requests must be approved by the teacher before you can access assignments.'
                : 'Already have a code? Entering it bypasses teacher approval.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GamificationCard({ user }: { user: any }) {
  const currentXP = user?.xp || 0;
  const currentLevel = user?.level || 1;
  const streak = user?.streak || 0;

  // XP Progress towards next level (150 XP per level)
  const xpInCurrentLevel = currentXP % 150;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / 150) * 100));

  return (
    <Card className="bg-white overflow-hidden border-[#E2E8F0]">
      <CardHeader className="bg-slate-50 border-b border-[#E2E8F0]">
        <span className="text-xs font-bold uppercase text-[#64748B] tracking-wide">
          Rank & Progression
        </span>
        <h3 className="text-lg font-bold text-slate-900 mt-1">Level {currentLevel} Scholar</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-[#64748B] mb-1.5 font-medium">
            <span>{xpInCurrentLevel} / 150 XP</span>
            <span>{150 - xpInCurrentLevel} XP to Level {currentLevel + 1}</span>
          </div>
          <div className="w-full bg-[#F8FAFC] h-3 rounded-full overflow-hidden p-0.5 border border-[#E2E8F0]">
            <div
              className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="text-xs text-[#64748B] flex items-center justify-between border-t border-[#E2E8F0] pt-4">
          <span>Completed Practice Nodes:</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{user?.completedNodes?.length || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}
