import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  BrainCircuit, 
  Target, 
  BarChart3, 
  MessageSquare,
  BookOpen,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StudentHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 pb-12 animate-in fade-in duration-500">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-white rounded-3xl p-10 md:p-14 border border-slate-200/60 shadow-sm overflow-hidden flex flex-col md:flex-row items-center gap-10">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        
        <div className="flex-1 space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium text-sm border border-blue-100">
            <Sparkles size={16} />
            <span>AI-Powered Learning</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Learn Smarter. <br/> Grow Faster. <br/> <span className="text-blue-600">With AI.</span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
            Your personalized AI-powered learning companion that helps you understand concepts, track your progress, and build better learning habits.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/student" className="btn-primary px-6 py-3 text-base">
              Start Learning <ArrowRight size={18} />
            </Link>
            <Link to="/student/workspaces" className="btn-secondary px-6 py-3 text-base">
              Explore Workspace
            </Link>
          </div>
        </div>

        {/* Hero Illustration / Dashboard Preview */}
        <div className="flex-1 w-full relative z-10 hidden md:block">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">AI Assistant</div>
                  <div className="text-xs text-slate-500">Ready to help</div>
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
                92% Mastery
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[75%] rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">Concepts</div>
                  <div className="text-lg font-bold text-slate-800">24/32</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">Next Topic</div>
                  <div className="text-sm font-semibold text-blue-600 truncate">Machine Learning Basics</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AI PERSONALIZATION SECTION */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900">Your Learning, Powered by AI</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Experience a platform that adapts to your unique learning style.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: BrainCircuit, title: 'Personalized Learning', desc: 'AI adapts your learning journey based on your progress.' },
            { icon: Target, title: 'Smart Recommendations', desc: 'Get recommendations for concepts and topics you should learn next.' },
            { icon: BarChart3, title: 'Progress Intelligence', desc: 'Understand your strengths, weaknesses and mastery level.' },
            { icon: MessageSquare, title: 'AI Study Assistant', desc: 'Get instant help while studying difficult concepts.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HOW EDUFLOW AI WORKS */}
      <section className="py-8">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-10">How EduFlow AI Works</h2>
        <div className="flex flex-col md:flex-row items-start justify-center gap-8 md:gap-0 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-6 left-[15%] right-[15%] h-0.5 bg-slate-200 z-0"></div>
          
          {[
            { step: '01', title: 'Learn', desc: 'Study concepts through your personalized workspace.' },
            { step: '02', title: 'Practice', desc: 'Complete assignments and strengthen your understanding.' },
            { step: '03', title: 'Improve', desc: 'AI analyzes your progress and recommends what to learn next.' }
          ].map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative z-10 group">
              <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center text-blue-600 font-bold text-sm mb-4 group-hover:border-blue-100 group-hover:bg-blue-50 transition-colors">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 max-w-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. STUDENT PROGRESS PREVIEW */}
      <section className="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900">See Your Learning Journey</h2>
          <Link to="/student/progress" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Full Progress <ArrowRight size={16} />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-medium text-slate-500 mb-1">Overall Mastery</div>
            <div className="text-3xl font-extrabold text-slate-900">{user?.xp ? Math.min(100, Math.floor(user.xp / 10)) : 85}%</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-medium text-slate-500 mb-1">Concepts Completed</div>
            <div className="text-3xl font-extrabold text-slate-900">12<span className="text-lg text-slate-400 font-medium">/15</span></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-medium text-slate-500 mb-1">Assignments</div>
            <div className="text-3xl font-extrabold text-slate-900">8<span className="text-lg text-slate-400 font-medium">/10</span></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-medium text-slate-500 mb-1">Learning Streak</div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{user?.streak || 5}</span>
              <span className="text-amber-500 text-xl">🔥</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. AI RECOMMENDATION BANNER */}
      <section className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles size={24} className="text-blue-600" /> 
            Your AI Learning Companion
          </h2>
          <p className="text-slate-600 max-w-2xl">
            Not sure what to study next? EduFlow AI analyzes your learning activity and helps you choose the next best step to maximize retention.
          </p>
        </div>
        <div className="shrink-0">
          <Link to="/student/workspaces" className="btn-primary py-3 px-6 bg-blue-600 hover:bg-blue-700 shadow-sm">
            Open Study Workspace <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 6. FEATURED LEARNING SECTION */}
      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Explore Your Learning Tools</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Study Workspace', desc: 'Interact with AI-powered video, documents, and flashcards.', to: '/student/workspaces', icon: FolderKanban },
            { title: 'Assignments', desc: 'Complete adaptive assignments tuned to your level.', to: '/student/assignments', icon: BookOpen },
            { title: 'Progress Analytics', desc: 'View detailed insights into your learning journey.', to: '/student/progress', icon: BarChart3 }
          ].map((tool, i) => (
            <Link key={i} to={tool.to} className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 transition-all block">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <tool.icon size={20} />
                </div>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{tool.title}</h3>
              <p className="text-sm text-slate-500">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="text-center py-10 space-y-6">
        <h2 className="text-3xl font-extrabold text-slate-900">Ready to make your next learning session smarter?</h2>
        <div className="flex justify-center">
          <Link to="/student" className="btn-primary px-8 py-4 text-lg rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
            Start Learning <ArrowRight size={20} />
          </Link>
        </div>
      </section>

    </div>
  );
}
