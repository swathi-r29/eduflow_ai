import React from 'react';
import { X, Apple, Users, Clock, AlertTriangle, Video, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PeerPair {
  mentor: string;
  learner: string;
  concept: string;
}

export interface RecommendedClip {
  title: string;
  timestamp: string;
  seconds: number;
  workspaceId?: string;
  videoId?: string;
}

export interface ReTeachPlan {
  summary?: string;
  topWeaknesses?: string[];
  peerPairs?: PeerPair[];
  lessonPlan?: string[];
  recommendedClips?: RecommendedClip[];
}

interface ReTeachPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ReTeachPlan | null;
  isLoading: boolean;
}

export default function ReTeachPlanModal({ isOpen, onClose, plan, isLoading }: ReTeachPlanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 p-6 sm:p-7 shadow-2xl rounded-3xl relative space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-md shadow-blue-500/20">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">AI 15-Min Re-Teaching & Micro-Grouping Assistant</h3>
              <p className="text-xs text-slate-500 font-medium">Class-wide misconception clusters & peer mentoring pairs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-all text-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs font-bold text-slate-600 animate-pulse">
              Analyzing class analytics & assembling peer pairs...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header summary */}
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                Target Strategy Overview
              </span>
              <p className="text-sm font-extrabold text-slate-800">{plan?.summary || 'Class Re-Teaching Strategy'}</p>
            </div>

            {/* Top Misconceptions */}
            {plan?.topWeaknesses && plan.topWeaknesses.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                  ⚠️ Primary Class Misconception Areas
                </span>
                <div className="flex flex-wrap gap-2">
                  {plan.topWeaknesses.map((w, i) => (
                    <span key={i} className="text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-lg px-3 py-1 font-bold">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Peer Study Pairs */}
            {plan?.peerPairs && plan.peerPairs.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                  🤝 Recommended Peer Study Pairs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plan.peerPairs.map((pair, i) => (
                    <div key={i} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="text-emerald-700">Mentor: {pair.mentor}</span>
                        <span className="text-blue-600">Learner: {pair.learner}</span>
                      </div>
                      <p className="text-slate-500 font-semibold">Focus: <strong className="text-slate-700">{pair.concept}</strong></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 15-Minute Re-Teach Lesson Plan */}
            {plan?.lessonPlan && plan.lessonPlan.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                  ⏱️ 15-Minute Class Re-Teach Step-by-Step Schedule
                </span>
                <div className="space-y-2">
                  {plan.lessonPlan.map((step, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-medium leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Video Timestamps */}
            {plan?.recommendedClips && plan.recommendedClips.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-indigo-600" /> Click-to-Timestamp Video Deep-Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {plan.recommendedClips.map((clip, i) => (
                    <Link
                      key={i}
                      to={clip.workspaceId ? `/student/workspaces/${clip.workspaceId}?videoId=${clip.videoId || ''}&seek=${clip.seconds}` : '#'}
                      onClick={() => onClose()}
                      className="p-3 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-2xl flex items-center justify-between text-xs transition-all group"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 group-hover:text-indigo-700 block line-clamp-1">{clip.title}</span>
                        <span className="font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-100 inline-block text-[11px]">
                          ⏱️ Jump to {clip.timestamp}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button onClick={onClose} className="btn-primary text-xs font-bold py-2.5 px-5">
                Done & Close Strategy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
