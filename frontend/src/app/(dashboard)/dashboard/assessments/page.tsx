"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { BookOpen, Clock, Trophy, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AssessmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/assessments/my-assignments');
      setAssignments(response.data);
    } catch (err: any) {
      console.error('Failed to fetch assignments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleRequestMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || !reason) return;
    setSubmitting(true);
    try {
      await api.post(`/assessments/${activeAssignment.id}/makeup-request`, { reason });
      toast.success("Makeup request submitted successfully");
      setRequestModalOpen(false);
      setReason('');
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Assessments</h2>
          <p className="text-slate-500 mt-1">Loading assigned assessments...</p>
        </div>
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Assessments</h2>
        <p className="text-slate-500 mt-1">View your assigned assessments and requests.</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No assessments assigned</p>
            <p className="text-slate-500 text-sm mt-1">You currently have no pending or past assessments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map(a => (
            <Card key={a.student_assessment_id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium capitalize">
                        {a.type}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>{a.question_count} questions</span>
                  </div>
                  {a.duration_minutes && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{a.duration_minutes} minutes</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <Trophy className="w-4 h-4 text-blue-600" />
                    <span>Pass: {a.passing_score}%</span>
                  </div>
                </div>

                {a.status === 'missed' && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                    <div className="flex items-center text-red-700 font-semibold text-sm mb-1">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Missed
                    </div>
                    <p className="text-xs text-red-600">You did not submit this assessment on time.</p>
                  </div>
                )}
                
                {a.makeup_request && (
                  <div className={`p-3 border rounded-md text-sm font-medium ${
                    a.makeup_request.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                    a.makeup_request.status === 'approved' ? 'bg-green-50 text-green-800 border-green-200' :
                    'bg-slate-50 text-slate-800 border-slate-200'
                  }`}>
                    Makeup Request: {a.makeup_request.status.toUpperCase()}
                  </div>
                )}

                {a.status === 'makeup_approved' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
                    <p className="font-semibold mb-1">Makeup Window Approved</p>
                    <p>Start: {new Date(a.makeup_start_at).toLocaleString()}</p>
                    <p>End: {new Date(a.makeup_end_at).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-4 border-t bg-slate-50">
                {a.status === 'missed' && !a.makeup_request ? (
                  <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => { setActiveAssignment(a); setRequestModalOpen(true); }}>
                    Request Makeup Assessment
                  </Button>
                ) : (a.status === 'not_started' || a.status === 'makeup_approved') ? (
                  <Link href={`/dashboard/assessments/${a.id}`} className="w-full">
                    <Button className="w-full group">
                      Start Assessment
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : a.status === 'submitted' || a.status === 'makeup_submitted' ? (
                  a.release_results_at && new Date(a.release_results_at) <= new Date() ? (
                    <Link href={`/dashboard/assessments/${a.id}/results`} className="w-full">
                      <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                        View Results
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full text-slate-500 bg-slate-100" disabled>
                      <Clock className="w-4 h-4 mr-2" /> Awaiting Results
                    </Button>
                  )
                ) : (
                  <Button variant="outline" className="w-full text-slate-600" disabled>
                    {a.status.replace('_', ' ').toUpperCase()}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Makeup Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Request Makeup Assessment</h2>
            <p className="text-sm text-slate-500 mb-4">
              Please explain why you were unable to participate in <strong>{activeAssignment?.name}</strong>.
            </p>
            <form onSubmit={handleRequestMakeup}>
              <textarea
                required
                rows={4}
                className="w-full border rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Reason for missing the assessment..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setRequestModalOpen(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
