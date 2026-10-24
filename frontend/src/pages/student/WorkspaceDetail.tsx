import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Workspace, DocumentItem, VideoItem, TutorSource } from '../../types';
import VideoPlayer, { VideoPlayerRef } from '../../components/common/VideoPlayer';
import FlashcardViewer, { Flashcard } from '../../components/common/FlashcardViewer';
import InteractiveQuizViewer from '../../components/common/InteractiveQuizViewer';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { UploadCloud, FileText, Video as VideoIcon, Send, Sparkles, Clock, Play, Youtube, Link as LinkIcon, Maximize2, Copy, Check } from 'lucide-react';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';

import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

type ChatMsg = { role: 'user' | 'assistant'; content: string; sources?: TutorSource[]; grounded?: boolean };

export default function WorkspaceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [contentMode, setContentMode] = useState('quiz');
  const [socraticMode, setSocraticMode] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('active');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [parsedFlashcards, setParsedFlashcards] = useState<Flashcard[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Content Modal & Copy state
  const [showFullModal, setShowFullModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // YouTube modal state
  const [showYtModal, setShowYtModal] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [submittingYt, setSubmittingYt] = useState(false);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const load = () => {
    return api.get(`/workspaces/${id}`).then((r) => {
      const ws = r.data.workspace as Workspace;
      setWorkspace(ws);
      const vList = (ws.videos || []) as VideoItem[];
      if (vList.length > 0 && !activeVideoId) {
        const urlVideoId = searchParams.get('videoId');
        if (urlVideoId && vList.some((v) => v._id === urlVideoId)) {
          setActiveVideoId(urlVideoId);
        } else {
          const readyVid = vList.find((v) => v.status === 'ready');
          if (readyVid) setActiveVideoId(readyVid._id);
          else setActiveVideoId(vList[0]._id);
        }
      }
    }).catch((err) => {
      // Graceful poll retry on transient server restart/network glitch
    });
  };

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 4000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // If URL has seek parameter, jump video player once loaded
  useEffect(() => {
    const seekSec = searchParams.get('seek');
    if (seekSec && videoPlayerRef.current) {
      setTimeout(() => {
        videoPlayerRef.current?.seekTo(Number(seekSec));
      }, 500);
    }
  }, [searchParams, activeVideoId]);

  const uploadDocument = async (file: File) => {
    const form = new FormData();
    form.append('workspaceId', id!);
    form.append('file', file);
    await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    load();
  };

  const uploadVideo = async (file: File) => {
    const form = new FormData();
    form.append('workspaceId', id!);
    form.append('file', file);
    const { data } = await api.post('/videos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (data.video?._id) setActiveVideoId(data.video._id);
    load();
  };

  const addYoutubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setSubmittingYt(true);
    try {
      const { data } = await api.post('/videos/youtube', {
        workspaceId: id,
        youtubeUrl: ytUrl.trim(),
        title: ytTitle.trim() || undefined
      });
      if (data.video?._id) setActiveVideoId(data.video._id);
      setShowYtModal(false);
      setYtUrl('');
      setYtTitle('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add YouTube video');
    } finally {
      setSubmittingYt(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    const q = question;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setAsking(true);
    try {
      const { data } = await api.post('/study/query', { workspaceId: id, question: q, conversationId, socraticMode });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources, grounded: data.grounded }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.response?.data?.error || 'Something went wrong.' }]);
    } finally {
      setAsking(false);
    }
  };

  const handleCopyContent = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generate = async () => {
    setGenerating(true);
    setGeneratedContent(null);
    setParsedFlashcards([]);
    try {
      const targetSourceId = selectedSourceId === 'active' ? (activeVideoId || undefined) : selectedSourceId === 'all' ? undefined : selectedSourceId;
      const { data } = await api.post('/study/summarize', {
        workspaceId: id,
        mode: contentMode,
        sourceId: targetSourceId,
        videoId: targetSourceId || activeVideoId || undefined
      });
      setGeneratedContent(data.content);

      // Auto-open full screen modal so the user gets un-clamped view immediately
      setShowFullModal(true);

      if (contentMode === 'flashcards') {
        try {
          let cards: Flashcard[] = [];
          const cleanText = data.content.replace(/```json|```/g, '').trim();
          if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
            cards = JSON.parse(cleanText);
          } else {
            const lines = data.content.split('\n').filter((l: string) => l.trim());
            for (let i = 0; i < lines.length; i += 2) {
               if (lines[i]) {
                cards.push({
                  front: lines[i].replace(/^Q:?\s*|^-\s*/i, ''),
                  back: lines[i + 1] ? lines[i + 1].replace(/^A:?\s*|^-\s*/i, '') : 'Review source notes for details.'
                });
               }
            }
          }
          if (cards.length > 0) setParsedFlashcards(cards);
        } catch (e) {
          // JSON parse fallback
        }
      }
    } catch (err: any) {
      setGeneratedContent(err.response?.data?.error || 'Could not generate content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSourceClick = (source: TutorSource) => {
    if (source.sourceType === 'video') {
      if (source.sourceId && videos.some((v) => v._id === source.sourceId)) {
        setActiveVideoId(source.sourceId);
      }
      if (source.startTime != null && videoPlayerRef.current) {
        videoPlayerRef.current.seekTo(source.startTime);
      }
    }
  };

  if (!workspace) return <p className="text-[#64748B]">Loading study workspace...</p>;
  const documents = (workspace.documents || []) as DocumentItem[];
  const videos = (workspace.videos || []) as VideoItem[];
  const activeVideo = videos.find((v) => v._id === activeVideoId) || videos[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{workspace.title}</h1>
          <p className="text-[#64748B] text-sm mt-0.5">{workspace.description || 'AI Multimodal Learning Workspace'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={docInputRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])} />
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          <Button variant="secondary" onClick={() => docInputRef.current?.click()}>
            <UploadCloud size={16} /> Upload Doc
          </Button>
          <Button variant="secondary" onClick={() => videoInputRef.current?.click()}>
            <UploadCloud size={16} /> Upload Video
          </Button>
          <Button variant="secondary" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowYtModal(true)}>
            <Youtube size={16} /> YouTube Link
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player / Materials (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Video Player */}
          {activeVideo ? (
            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm">
               <VideoPlayer ref={videoPlayerRef} video={activeVideo} baseUrl={window.location.origin.includes('localhost') ? 'http://localhost:5000' : ''} />
            </div>
          ) : (
            <Card className="text-center py-12">
              <VideoIcon size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-900">No video added yet</p>
              <p className="text-sm text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
                Add a YouTube video link or upload a video file to unlock Gemini video understanding, automated timestamping, and grounded Q&A.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="primary" onClick={() => setShowYtModal(true)}>
                  <Youtube size={16} /> Add YouTube Link
                </Button>
                <Button variant="secondary" onClick={() => videoInputRef.current?.click()}>
                  <UploadCloud size={14} /> Upload Video File
                </Button>
              </div>
            </Card>
          )}

          {/* Uploaded Resources List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document list */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-900"><FileText size={16} className="text-[#2563EB]" /> Documents</h2>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {documents.map((d) => (
                    <div key={d._id} className="text-sm flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                      <span className="truncate max-w-[150px] text-slate-700 font-medium">{d.originalName}</span>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                  {documents.length === 0 && <p className="text-sm text-[#64748B]">No documents uploaded.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Video list */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-900"><VideoIcon size={16} className="text-[#4F46E5]" /> Videos</h2>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {videos.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setActiveVideoId(v._id)}
                      className={`w-full text-left text-sm p-2 rounded-lg transition-colors border ${
                        v._id === activeVideo?._id
                          ? 'bg-blue-50 border-blue-200 text-[#2563EB]'
                          : 'bg-white border-[#E2E8F0] hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[130px] font-medium flex items-center gap-1.5">
                          {v.youtubeUrl ? <Youtube size={14} className="text-red-500 shrink-0" /> : <Play size={12} className="shrink-0" />}
                          <span className="truncate">{v.originalName}</span>
                        </span>
                        <StatusPill status={v.status} />
                      </div>
                    </button>
                  ))}
                  {videos.length === 0 && <p className="text-sm text-[#64748B]">No videos added.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Grounded AI Tutor & Content Generator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Study Assistant Chat */}
          <Card className="flex flex-col h-[560px]">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#2563EB]" />
                <h2 className="font-bold text-sm text-slate-900">Grounded AI Tutor</h2>
              </div>

              {/* Socratic Guardrail Toggle Switch */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSocraticMode(true)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    socraticMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                  title="Socratic Mode: Guides with clues & questions; refuses to give away direct solutions"
                >
                  🛡️ Socratic Mentor
                </button>
                <button
                  type="button"
                  onClick={() => setSocraticMode(false)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    !socraticMode
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Direct Answers: Standard Q&A mode"
                >
                  Direct Answers
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 text-sm flex flex-col bg-slate-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`p-3.5 rounded-xl max-w-[90%] shadow-sm ${m.role === 'user' ? 'bg-[#2563EB] text-white ml-auto rounded-tr-sm' : 'bg-white border border-[#E2E8F0] text-slate-800 rounded-tl-sm'}`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>

                  {/* Sources pilled list */}
                  {m.sources && m.sources.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${m.role === 'user' ? 'border-blue-500' : 'border-[#E2E8F0]'} space-y-2`}>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${m.role === 'user' ? 'text-blue-200' : 'text-[#64748B]'}`}>Sources:</p>
                      {m.sources.map((s, si) => (
                        <div key={si} className={`text-xs flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${m.role === 'user' ? 'bg-blue-600 border-blue-500' : 'bg-slate-50 border-[#E2E8F0]'}`}>
                          <span className="truncate max-w-[150px] font-medium">
                            {s.sourceType === 'video' ? '📹' : '📄'} {s.sourceName}
                            {s.page != null ? ` (p. ${s.page})` : ''}
                          </span>
                          {s.sourceType === 'video' && s.startTime != null && (
                            <button
                              onClick={() => handleSourceClick(s)}
                              className={`text-[11px] px-2 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${m.role === 'user' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                            >
                              <Clock size={12} /> {formatSecondsToTimestamp(s.startTime)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.grounded === false && (
                    <p className="text-[11px] text-amber-600 mt-2 italic font-medium">
                      ⚠️ AI Note: Information not explicitly found in your uploaded materials.
                    </p>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-12 text-[#64748B] space-y-3">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#2563EB]">
                    <Sparkles size={24} />
                  </div>
                  <p className="font-medium text-slate-900">Ask questions about your materials</p>
                  <p className="text-xs max-w-[200px] mx-auto">Answers are grounded in vector embeddings with timestamp source references.</p>
                </div>
              )}
            </CardContent>

            <div className="p-4 border-t border-[#E2E8F0] bg-white">
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-sm bg-slate-50"
                  placeholder="Ask about key concepts..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ask()}
                />
                <Button variant="primary" onClick={ask} disabled={asking}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Generator Controls */}
          <Card>
            <CardHeader className="pb-3 border-b border-[#E2E8F0]">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <Sparkles size={16} className="text-[#4F46E5]" /> Content Generator
                </h2>
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">EduFlow AI</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Target Material Source</label>
                <select
                  className="input-field text-sm w-full font-medium"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                >
                  <option value="active">
                    ▶️ Active Video ({activeVideo ? activeVideo.originalName : 'Currently Selected'})
                  </option>
                  <option value="all">🌐 All Uploaded Videos & Documents (Combined)</option>
                  {videos.length > 0 && (
                    <optgroup label="Videos">
                      {videos.map((v) => (
                        <option key={v._id} value={v._id}>
                          📹 {v.originalName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {documents.length > 0 && (
                    <optgroup label="Documents">
                      {documents.map((d) => (
                        <option key={d._id} value={d._id}>
                          📄 {d.originalName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex gap-2">
                <select className="input-field text-sm flex-1 font-medium" value={contentMode} onChange={(e) => setContentMode(e.target.value)}>
                  <option value="quiz">Practice Questions & Quiz</option>
                  <option value="practice_questions">Conceptual Practice Questions</option>
                  <option value="summary">Summary</option>
                  <option value="short_summary">5-Point Key Summary</option>
                  <option value="notes">Structured Study Notes</option>
                  <option value="flashcards">Interactive Flashcards</option>
                  <option value="revision_plan">Revision Plan</option>
                  <option value="key_concepts">Key Concepts & Definitions</option>
                </select>
                <Button variant="primary" onClick={generate} disabled={generating}>
                  <Sparkles size={16} /> {generating ? '...' : 'Generate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* YouTube Link Modal */}
      {showYtModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader className="flex justify-between items-center border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Youtube size={22} className="text-red-600" /> Add YouTube Video Link
              </h2>
              <button onClick={() => setShowYtModal(false)} className="text-[#64748B] hover:text-slate-900 text-sm">✕</button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-[#64748B] leading-relaxed">
                Paste a YouTube video URL. EduFlow AI will automatically analyze the video and index timestamped concepts for grounded Q&A.
              </p>
              <form onSubmit={addYoutubeVideo} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">YouTube Link / URL</label>
                  <div className="relative">
                    <LinkIcon size={16} className="absolute left-3 top-2.5 text-[#64748B] pointer-events-none" />
                    <input
                      required
                      type="url"
                      className="input-field !pl-10"
                      placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Video Title (Optional)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Java OOP Tutorial"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowYtModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={submittingYt}>
                    <Youtube size={16} /> {submittingYt ? 'Adding...' : 'Add Video'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Content View Modal */}
      {showFullModal && generatedContent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles size={18} className="text-[#2563EB]" />
                <h2 className="text-lg font-bold">
                  {contentMode === 'revision_plan' ? 'Full Revision & Study Plan' : `${contentMode.replace(/_/g, ' ').toUpperCase()}`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyContent}
                  className={copied ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowFullModal(false)}>
                  ✕ Close
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-800 leading-relaxed font-sans select-text">
              {contentMode === 'quiz' || contentMode === 'practice_questions' ? (
                <InteractiveQuizViewer
                  rawContent={generatedContent}
                  title={`Interactive ${contentMode === 'quiz' ? 'Practice Quiz' : 'Practice Questions'}`}
                  onRetake={generate}
                />
              ) : contentMode === 'flashcards' && parsedFlashcards.length > 0 ? (
                <FlashcardViewer cards={parsedFlashcards} onRegenerate={generate} isGenerating={generating} />
              ) : (
                <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-[#2563EB]">
                   <MarkdownRenderer content={generatedContent} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles = status === 'ready' 
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : status === 'failed' 
    ? 'bg-red-50 text-red-700 border border-red-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse';
    
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${styles}`}>{status}</span>;
}
