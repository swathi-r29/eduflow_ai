import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { VoiceInputButton } from '../../components/common/VoiceInputButton';
import { Sparkles, Camera, CheckCircle2, AlertCircle, FileText, Send, Loader2, ArrowLeft, BookOpen } from 'lucide-react';

export const PublicSubmission: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<any>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [answerText, setAnswerText] = useState('');

  // Pre-flight AI Coach state
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightData, setPreflightData] = useState<any>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) {
      setStudentName(user.name);
    }
  }, [user]);

  useEffect(() => {
    async function fetchAssignment() {
      try {
        const res = await api.get(`/assignments/${assignmentId}`);
        setAssignment(res.data.assignment || res.data);
      } catch (err) {
        console.error('Failed to load assignment:', err);
      } finally {
        setLoadingAssignment(false);
      }
    }
    if (assignmentId) fetchAssignment();
  }, [assignmentId]);

  const handleVoiceTranscript = (text: string) => {
    setAnswerText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Image = reader.result as string;
        const res = await api.post('/submissions/ocr', {
          assignmentId,
          imageInput: base64Image
        });

        if (res.data.ocrResult?.transcription) {
          setAnswerText((prev) => (prev ? `${prev}\n\n${res.data.ocrResult.transcription}` : res.data.ocrResult.transcription));
        }
      } catch (err) {
        console.error('OCR transcription failed:', err);
        alert('Failed to transcribe handwritten image. Please try again.');
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePreflightCheck = async () => {
    if (!answerText.trim()) return;
    setPreflightLoading(true);
    try {
      const res = await api.post('/submissions/preflight', {
        assignmentId,
        answerText
      });
      setPreflightData(res.data.preflight);
    } catch (err) {
      console.error('Preflight check failed:', err);
    } finally {
      setPreflightLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) {
      alert('Please enter your answer text.');
      return;
    }

    setSubmitting(true);
    try {
      if (user && user.role === 'student') {
        const res = await api.post('/submissions', {
          assignmentId,
          answerText
        });
        setSubmittedId(res.data.submission._id);
      } else {
        if (!studentName.trim() && !rollNumber.trim()) {
          alert('Please fill in your name or roll number.');
          setSubmitting(false);
          return;
        }
        const res = await axios.post(`/api/submissions/public/${assignmentId}`, {
          studentName,
          rollNumber,
          answerText
        });
        setSubmittedId(res.data.submission._id);
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAssignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Submission Successful!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Thank you, <span className="font-semibold text-slate-800 dark:text-slate-200">{studentName || rollNumber}</span>. Your work has been submitted for AI evaluation.
          </p>
          <div className="pt-4">
            <button
              onClick={() => {
                setSubmittedId(null);
                setAnswerText('');
                setPreflightData(null);
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all"
            >
              Submit Another Answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Assignments
        </button>

        {/* Full Question Header & Prompt Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#2563EB] text-xs font-semibold rounded-full border border-blue-100">
              <FileText size={13} /> Coursework
            </span>
            {assignment?.maxScore && (
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-md">
                Max Score: {assignment.maxScore} pts
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {assignment?.title || 'Assignment Submission'}
            </h1>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <BookOpen size={13} /> Full Assignment Question / Prompt
            </h3>
            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {assignment?.question || assignment?.description}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alice Smith"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Roll / Student ID Number</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. CS2026-042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Your Answer / Code / Explanation</label>
              
              <div className="flex items-center gap-2">
                <VoiceInputButton onTranscript={handleVoiceTranscript} />

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 cursor-pointer transition-all">
                  {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{ocrLoading ? 'Scanning...' : 'Photo OCR'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              rows={8}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer, dictate using voice, or upload a photo of handwritten work..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Pre-flight AI Coach */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePreflightCheck}
                disabled={preflightLoading || !answerText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all disabled:opacity-50"
              >
                {preflightLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-500" />}
                <span>Run Pre-Flight AI Coach Check</span>
              </button>
            </div>

            {preflightData && (
              <div className="mt-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Draft Readiness Score</span>
                  <span className="text-lg font-black text-purple-800 dark:text-purple-200">{preflightData.readinessScore}%</span>
                </div>

                <p className="text-xs text-purple-900 dark:text-purple-100 font-medium">{preflightData.encouragingNote}</p>

                {preflightData.coveredCriteria?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Covered Criteria:</span>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside space-y-0.5">
                      {preflightData.coveredCriteria.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {preflightData.actionableHints?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block mb-1">Actionable Hints:</span>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside space-y-0.5">
                      {preflightData.actionableHints.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !answerText.trim() || (!studentName.trim() && !rollNumber.trim())}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{submitting ? 'Submitting...' : 'Submit Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicSubmission;
