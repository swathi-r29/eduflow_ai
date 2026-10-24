import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Workspace } from '../../types';
import { FolderPlus, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const load = () => api.get('/workspaces').then((r) => {
    const list = r.data.workspaces || [];
    setWorkspaces(list);
    const seek = searchParams.get('seek');
    if (seek && list.length > 0) {
      navigate(`/student/workspaces/${list[0]._id}?seek=${seek}`, { replace: true });
    }
  });
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return;
    await api.post('/workspaces', { title });
    setTitle('');
    setCreating(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Workspaces</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your learning materials and AI chat sessions.</p>
        </div>
        <Button onClick={() => setCreating(true)} variant="primary">
          <FolderPlus size={16} /> New workspace
        </Button>
      </div>

      {creating && (
        <Card className="max-w-md border-[#2563EB]/20 bg-[#EFF5FF] shadow-md">
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">Workspace Title</label>
              <input 
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all" 
                placeholder="e.g. Java OOP – Semester Prep" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}>Create Workspace</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workspaces.map((w) => (
          <Link key={w._id} to={`/student/workspaces/${w._id}`}>
            <Card className="h-full hover:border-[#2563EB]/50 hover:shadow-md transition-all group">
              <CardContent className="h-full flex flex-col">
                <div className="w-10 h-10 bg-blue-50 text-[#2563EB] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-bold text-slate-900 line-clamp-1">{w.title}</h3>
                <p className="text-sm text-[#64748B] mt-1 line-clamp-2 flex-1">
                  {w.description || 'No description provided for this workspace.'}
                </p>
                
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-medium text-[#64748B]">
                  <span>{Array.isArray(w.documents) ? w.documents.length : 0} Docs</span>
                  <span>{Array.isArray(w.videos) ? w.videos.length : 0} Videos</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {workspaces.length === 0 && !creating && (
        <EmptyState
          icon={FolderPlus}
          title="No learning workspace yet"
          description="Upload a lecture or study material to start learning with EduFlow AI."
          action={<Button onClick={() => setCreating(true)}>Create Workspace</Button>}
        />
      )}
    </div>
  );
}
