import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ChevronLeft, ChevronRight, Sparkles, Clock, Download, Printer, FileText } from 'lucide-react';
import { api } from '../../api/client';

export interface Flashcard {
  id?: string | number;
  _id?: string;
  front: string;
  back: string;
  concept?: string;
  interval?: number;
  repetition?: number;
  dueDate?: string;
}

interface FlashcardViewerProps {
  workspaceId?: string;
  cards: Flashcard[];
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export default function FlashcardViewer({ workspaceId, cards, onRegenerate, isGenerating }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardList, setCardList] = useState<Flashcard[]>(cards);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cardList || cardList.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-400 text-sm mb-3">No flashcards available yet.</p>
        {onRegenerate && (
          <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={onRegenerate} disabled={isGenerating}>
            <Sparkles size={16} /> {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </button>
        )}
      </div>
    );
  }

  const currentCard = cardList[currentIndex] || cardList[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cardList.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cardList.length) % cardList.length);
  };

  // Submit SuperMemo-2 Quality Score (1 = Again, 3 = Hard, 4 = Good, 5 = Easy)
  const handleSM2Rating = async (quality: number) => {
    if (!workspaceId || (!currentCard._id && !currentCard.id)) {
      handleNext();
      return;
    }

    const cardId = currentCard._id || currentCard.id;
    setIsSubmitting(true);
    try {
      const res = await api.post('/study/flashcard-review', {
        workspaceId,
        cardId,
        quality
      });

      // Update card in local state with returned interval
      setCardList((prev) =>
        prev.map((c, idx) =>
          idx === currentIndex ? { ...c, interval: res.data?.card?.interval, repetition: res.data?.card?.repetition } : c
        )
      );
    } catch (e) {
      console.error('Failed to submit SM-2 card rating:', e);
    } finally {
      setIsSubmitting(false);
      handleNext();
    }
  };

  const handlePrintStudySheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const cardsHtml = cardList.map((c, i) => `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fafafa;">
        <div style="font-weight: bold; color: #1e293b; font-size: 14px; margin-bottom: 6px;">Q${i + 1}: ${c.front}</div>
        <div style="color: #475569; font-size: 13px; line-height: 1.5;">${c.back}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>EduFlow AI — Exam Revision Study Sheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #0f172a; }
            h1 { font-size: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>EduFlow AI • 1-Page Exam Revision Cheat Sheet</h1>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 20px;">Generated automatically from spaced repetition concept cards.</p>
          ${cardsHtml}
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Sparkles className="text-indigo-600" size={18} />
          <span>Interactive Spaced Repetition Flashcards</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handlePrintStudySheet}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-all cursor-pointer"
            title="Export 1-Page Printable Exam Revision Sheet"
          >
            <Printer size={13} />
            <span>Print Study Sheet</span>
          </button>
          <span className="text-slate-400">Card {currentIndex + 1} of {cardList.length}</span>
          {currentCard.interval !== undefined && currentCard.interval > 0 && (
            <span className="flex items-center gap-1 bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded font-mono">
              <Clock size={12} /> Interval: {currentCard.interval}d
            </span>
          )}
        </div>
      </div>

      {/* Flashcard container with 3D perspective flip */}
      <div className="perspective-1000 min-h-[220px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${isFlipped}`}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`w-full min-h-[220px] rounded-2xl p-6 flex flex-col justify-between shadow-md transition-all border ${
              isFlipped
                ? 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-indigo-200'
                : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${isFlipped ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-200 text-slate-800 border border-slate-300'}`}>
                {isFlipped ? 'Answer / Explanation' : 'Question / Concept'}
              </span>
            </div>

            <div className="my-auto py-6 text-center">
              <p className={`text-lg md:text-xl font-bold leading-relaxed ${isFlipped ? 'text-indigo-950' : 'text-slate-900'}`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                <RotateCw size={13} /> Click card to flip
              </span>
              {currentCard.concept && (
                <span className="text-slate-600 font-semibold bg-white/80 px-2 py-0.5 rounded border border-slate-200">Topic: {currentCard.concept}</span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* SM-2 Recall Rating Controls (Visible after flipped) */}
      {isFlipped ? (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-center text-slate-600 font-medium">How well did you know this concept?</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleSM2Rating(1)}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              Again (1d)
            </button>
            <button
              onClick={() => handleSM2Rating(3)}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Hard ({Math.max(1, Math.round((currentCard.interval || 1) * 1.2))}d)
            </button>
            <button
              onClick={() => handleSM2Rating(4)}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Good ({Math.max(1, Math.round((currentCard.interval || 1) * (currentCard.repetition ? 2.5 : 1)))}d)
            </button>
            <button
              onClick={() => handleSM2Rating(5)}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all"
            >
              Easy ({Math.max(2, Math.round((currentCard.interval || 1) * 3))}d)
            </button>
          </div>
        </div>
      ) : (
        /* Navigation Controls */
        <div className="flex items-center justify-between pt-2">
          <button className="btn-secondary text-xs flex items-center gap-1" onClick={handlePrev}>
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="flex gap-2">
            {onRegenerate && (
              <button className="btn-secondary text-xs flex items-center gap-1" onClick={onRegenerate} disabled={isGenerating}>
                <RotateCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </div>

          <button className="btn-primary text-xs flex items-center gap-1" onClick={handleNext}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}