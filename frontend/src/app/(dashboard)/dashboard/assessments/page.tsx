"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { AlertTriangle, BookOpen, Clock, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Assignment = {
  id: string; student_assessment_id: string; name: string; type: string; subject_name?: string;
  question_count: number; duration_minutes?: number; passing_score: number; status: string;
  display_status: string; score?: number | null; release_results_at?: string | null;
  start_date?: string | null; end_date?: string | null; attempt_id?: string | null; makeup_request?: { status?: string } | null;
};

const statusLabel: Record<string, string> = { upcoming: 'Upcoming', available: 'Available', closed: 'Closed', in_progress: 'In Progress', makeup_in_progress: 'In Progress', submitted: 'Completed', auto_submitted: 'Completed', makeup_submitted: 'Completed', missed: 'Missed', not_started: 'Not Started', makeup_approved: 'Makeup Approved' };
const statusStyle: Record<string, string> = { upcoming: 'bg-slate-100 text-slate-700', available: 'bg-green-100 text-green-800', in_progress: 'bg-amber-100 text-amber-800', makeup_in_progress: 'bg-amber-100 text-amber-800', missed: 'bg-red-100 text-red-800', submitted: 'bg-green-100 text-green-800', auto_submitted: 'bg-green-100 text-green-800', makeup_submitted: 'bg-green-100 text-green-800' };

export default function AssessmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestFor, setRequestFor] = useState<Assignment | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setError('');
    try {
      const response = await api.get('/assessments/my-assignments');
      setAssignments(response.data);
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Assessments could not be loaded. Refresh to try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => { void fetchAssignments(); }, 0); return () => window.clearTimeout(timer); }, []);

  const requestMakeup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestFor || !reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/assessments/${requestFor.id}/makeup-request`, { reason: reason.trim() });
      toast.success('Makeup request submitted.');
      setRequestFor(null);
      setReason('');
      await fetchAssignments();
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      toast.error(typeof detail === 'string' ? detail : 'Makeup request could not be submitted.');
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="mx-auto max-w-7xl p-6 text-slate-500">Loading assigned assessments...</div>;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">My Assessments</h1><p className="mt-1 text-sm text-slate-500">Weekly assessments assigned to you.</p></div>
    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<Button variant="outline" size="sm" className="ml-3" onClick={() => { setLoading(true); void fetchAssignments(); }}>Retry</Button></div>}
    {!error && assignments.length === 0 ? <Card><CardContent className="p-12 text-center"><BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300"/><p className="font-medium text-slate-700">No assessments assigned</p><p className="mt-1 text-sm text-slate-500">Your assigned assessments will appear here.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {assignments.map(item => {
        const label = statusLabel[item.display_status] || statusLabel[item.status] || item.status;
        const inProgress = ['in_progress', 'makeup_in_progress'].includes(item.status);
        const done = ['submitted', 'auto_submitted', 'makeup_submitted'].includes(item.status);
        const released = !item.release_results_at || new Date(item.release_results_at) <= new Date();
        return <Card key={item.student_assessment_id} className="flex flex-col">
          <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.name}</CardTitle><CardDescription className="mt-1">{item.subject_name || item.type}</CardDescription></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[item.display_status] || statusStyle[item.status] || 'bg-slate-100 text-slate-700'}`}>{label}</span></div></CardHeader>
          <CardContent className="flex-1 space-y-3 text-sm text-slate-600"><div className="flex flex-wrap gap-x-4 gap-y-2"><span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-green-700"/>{item.question_count} questions</span>{item.duration_minutes && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-green-700"/>{item.duration_minutes} minutes</span>}<span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-green-700"/>Pass: {item.passing_score}%</span></div>
            {item.start_date && <p className="text-xs">Available {new Date(item.start_date).toLocaleString()}{item.end_date ? ` until ${new Date(item.end_date).toLocaleString()}` : ''}</p>}
            {item.status === 'missed' && <p className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 p-2 text-xs text-red-700"><AlertTriangle className="h-4 w-4"/>This assessment window has ended.</p>}
            {item.makeup_request?.status && <p className="rounded-md bg-slate-50 p-2 text-xs">Makeup request: {item.makeup_request.status}</p>}
          </CardContent>
          <CardFooter className="border-t bg-slate-50"><div className="w-full">{inProgress ? <Link href={`/dashboard/assessments/${item.id}`}><Button className="w-full">Resume Assessment</Button></Link> : done ? released ? <Link href={`/dashboard/assessments/${item.id}/results`}><Button variant="outline" className="w-full">View Result{item.score !== null && item.score !== undefined ? ` · ${item.score.toFixed(1)}%` : ''}</Button></Link> : <Button variant="outline" className="w-full" disabled>Awaiting Results</Button> : item.display_status === 'closed' ? <Button variant="outline" className="w-full" disabled>Assessment Closed</Button> : item.display_status === 'upcoming' ? <Button variant="outline" className="w-full" disabled>Available at scheduled time</Button> : item.status === 'missed' ? item.makeup_request?.status === 'pending' ? <Button variant="outline" className="w-full" disabled>Makeup request pending</Button> : <Button variant="outline" className="w-full" onClick={() => setRequestFor(item)}>Request Makeup</Button> : ['available', 'makeup_approved'].includes(item.display_status || item.status) ? <Link href={`/dashboard/assessments/${item.id}`}><Button className="w-full">Assessment Details</Button></Link> : <Button variant="outline" className="w-full" disabled>{label}</Button>}</div></CardFooter>
        </Card>;
      })}
    </div>}
    {requestFor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Request Makeup</CardTitle><CardDescription>Explain why you were unable to take {requestFor.name}.</CardDescription></CardHeader><CardContent><form onSubmit={requestMakeup} className="space-y-4"><textarea required rows={4} className="w-full rounded-md border p-3 text-sm" value={reason} onChange={event => setReason(event.target.value)} aria-label="Reason for makeup request"/><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRequestFor(null)} disabled={submitting}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button></div></form></CardContent></Card></div>}
  </div>;
}
