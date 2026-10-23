import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment, Submission, ClassItem } from '../../types';
import { FileText, Clock, CheckCircle, ArrowRight, Upload, BookOpen, Layers, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function Assignments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClassId = searchParams.get('classId') || '';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [aRes, sRes, cRes] = await Promise.all([
          api.get(selectedClassId ? `/assignments?classId=${selectedClassId}` : '/assignments'),
          api.get('/submissions/mine'),
          api.get('/classes')
        ]);
        setAssignments(aRes.data.assignments || []);
        setSubmissions(sRes.data.submissions || []);
        setClasses(cRes.data.classes || cRes.data || []);
      } catch (err) {
        console.error('Error loading assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClassId]);

  const selectClassFilter = (classId: string) => {
    if (classId) {
      setSearchParams({ classId });
    } else {
      setSearchParams({});
    }
  };

  const selectedClassObj = classes.find((c) => c._id === selectedClassId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const subMap = new Map<string, Submission>();
  submissions.forEach((s) => {
    const aId = typeof s.assignment === 'string' ? s.assignment : s.assignment?._id;
    if (aId) subMap.set(aId, s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {selectedClassObj ? `${selectedClassObj.name} Assignments` : 'Assignments'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            {selectedClassObj
              ? `Showing tasks specifically assigned for ${selectedClassObj.name} (${selectedClassObj.subject || 'General'}).`
              : 'View assigned coursework, submit your solutions, and review AI feedback.'}
          </p>
        </div>

        {selectedClassId && (
          <Button variant="secondary" size="sm" onClick={() => selectClassFilter('')}>
            <X size={14} className="mr-1" /> Clear Filter (Show All)
          </Button>
        )}
      </div>

      {/* Class Filter Tabs / Pills */}
      {classes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers size={13} /> Class:
          </span>
          <button
            onClick={() => selectClassFilter('')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              !selectedClassId
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Classes
          </button>
          {classes.map((cls) => (
            <button
              key={cls._id}
              onClick={() => selectClassFilter(cls._id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                selectedClassId === cls._id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      )}

      {assignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((assignment) => {
            const sub = subMap.get(assignment._id);
            const className = typeof assignment.class === 'object' && assignment.class !== null
              ? assignment.class.name
              : null;

            return (
              <Card key={assignment._id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardContent className="flex flex-col h-full p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] flex items-center gap-1.5">
                        <FileText size={12} className="text-[#2563EB]" /> Coursework
                      </span>
                      {className && (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {className}
                        </span>
                      )}
                    </div>
                    {sub ? (
                      <Badge status="submitted">
                        <CheckCircle size={12} className="mr-1" /> Submitted
                      </Badge>
                    ) : (
                      <Badge status="pending">
                        <Clock size={12} className="mr-1" /> Pending
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-base text-slate-900">{assignment.title}</h3>
                    <p className="text-sm text-[#64748B] line-clamp-3 leading-relaxed">
                      {assignment.question}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">
                      Max Score: <strong className="text-slate-900">{assignment.maxScore || 100}</strong>
                    </span>

                    {sub ? (
                      <Link to={`/student/submissions/${sub._id}`}>
                        <Button variant="secondary" size="sm">
                          View Feedback <ArrowRight size={14} className="ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/student/assignments/${assignment._id}/submit`}>
                        <Button variant="primary" size="sm">
                          <Upload size={14} className="mr-1.5" /> Submit
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={selectedClassObj ? `No Assignments for ${selectedClassObj.name}` : 'No Assignments Yet'}
          description={
            selectedClassObj
              ? `No coursework has been posted for ${selectedClassObj.name} yet.`
              : "You don't have any pending assignments. Check back later or ask your teacher for coursework."
          }
          action={
            selectedClassId ? (
              <Button variant="secondary" onClick={() => selectClassFilter('')}>
                View All Classes
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

