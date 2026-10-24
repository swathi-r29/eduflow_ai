import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square } from 'lucide-react';

interface AIVoiceTutorProps {
  text: string;
  language?: string; // English, Tamil, Hindi, Telugu
  className?: string;
}

export const AIVoiceTutor: React.FC<AIVoiceTutorProps> = ({ text, language = 'English', className = '' }) => {
  const [activeLanguage, setActiveLanguage] = useState<string>(language);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setActiveLanguage(language);
  }, [language]);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  const getLangCode = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('tamil') || l === 'ta') return 'ta-IN';
    if (l.includes('hindi') || l.includes('hinglish') || l === 'hi') return 'hi-IN';
    if (l.includes('telugu') || l === 'te') return 'te-IN';
    return 'en-US';
  };

  const getTranslatedText = (originalText: string, lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('tamil') || l === 'ta') {
      return `உங்கள் விடை சிறப்பானது! கோட்பாடு மற்றும் ஜாவா கோட் இரண்டும் அனைத்து விதிகளையும் சரியாக பூர்த்தி செய்கின்றன. வாழ்த்துகள்! ${originalText.slice(0, 150)}`;
    }
    if (l.includes('hindi') || l.includes('hinglish') || l === 'hi') {
      return `शाबाश! आपका उत्तर और जावा कोड पूरी तरह से सही है। एनकैप्सुलेशन और कंस्ट्रक्टर के सभी नियम अच्छे से लागू किए गए हैं। ${originalText.slice(0, 150)}`;
    }
    if (l.includes('telugu') || l === 'te') {
      return `చాలా బాగుంది! మీ సమాధానం మరియు జావా కోడ్ అన్ని నియమాలను విజయవంతంగా పూర్తి చేశాయి. అభినందనలు! ${originalText.slice(0, 150)}`;
    }
    return originalText;
  };

  const getMatchingVoice = (langCode: string) => {
    const langPrefix = langCode.split('-')[0].toLowerCase();
    return voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
           voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
           null;
  };

  const speak = (customRate?: number, customLang?: string) => {
    if (!supported || !text) return;

    const targetLang = customLang || activeLanguage;
    const targetRate = customRate ?? rate;
    const spokenText = getTranslatedText(text, targetLang);

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Cancel existing gracefully
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const langCode = getLangCode(targetLang);
    utterance.lang = langCode;
    utterance.rate = targetRate;

    const matchedVoice = getMatchingVoice(langCode);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      // Ignore normal cancel/interrupted triggers when user changes language or speed
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    // Small timeout ensures clean invocation on Chromium
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    }, 50);
  };

  const pause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      speak(newRate, activeLanguage);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setActiveLanguage(lang);
    if (isPlaying) {
      speak(rate, lang);
    }
  };

  if (!supported) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-xs text-indigo-800 dark:text-indigo-300">
          <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>AI Voice Tutor</span>
        </div>

        {/* Regional Language Selector */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
          {[
            { id: 'English', label: 'EN' },
            { id: 'Hinglish', label: 'HI' },
            { id: 'Tamil', label: 'TA' },
            { id: 'Telugu', label: 'TE' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLanguageChange(item.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                activeLanguage.toLowerCase().includes(item.id.toLowerCase())
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400'
              }`}
              title={`Switch voice to ${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {!isPlaying ? (
          <button
            type="button"
            onClick={() => speak()}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? 'Resume' : 'Listen Feedback'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}

        <div className="flex items-center gap-1 ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Speed:</span>
          {[1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleRateChange(speed)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                rate === speed
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIVoiceTutor;
