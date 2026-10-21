"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type History = { student_id: string; student_name: string; assessments: Array<{ assessment_id: string; assessment_name: string; status: string; score?: number | null; passed?: boolean | null; result_released?: boolean; submitted_at?: string | null }> };

export default function MenteeAssessmentHistoryPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get(`/assessments/mentors/me/students/${studentId}/assessment-history`).then(response => setHistory(response.data)).catch(err => setError(err.response?.status === 404 ? 'This student is not one of your active mentees.' : 'Assessment history could not be loaded.')).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [studentId]);
  if (loading) return <div className="p-6 text-slate-500">Loading assessment history...</div>;
  if (error) return <div className="space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link href="/mentor"><Button variant="outline">Back to mentees</Button></Link></div>;
  if (!history) return null;
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/mentor"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4"/>Back to mentees</Button></Link>
    <div><h1 className="text-2xl font-bold text-slate-900">{history.student_name}</h1><p className="mt-1 text-sm text-slate-500">Weekly assessment history</p></div>
    <Card><CardHeader><CardTitle>Assessment history</CardTitle><CardDescription>Read-only progress for this assigned mentee.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Assessment</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Outcome</th><th className="px-5 py-3">Submitted</th></tr></thead><tbody className="divide-y">{history.assessments.map(row => {
      const submitted = ['submitted', 'auto_submitted', 'makeup_submitted'].includes(row.status);
      const outcome = row.passed == null ? submitted && !row.result_released ? 'Awaiting results' : '—' : row.passed ? 'Passed' : 'Failed';
      return <tr key={row.assessment_id}><td className="px-5 py-3 font-medium">{row.assessment_name}</td><td className="px-5 py-3 capitalize">{row.status.replaceAll('_', ' ')}</td><td className="px-5 py-3">{row.score == null ? '—' : `${row.score.toFixed(1)}%`}</td><td className="px-5 py-3">{outcome}</td><td className="px-5 py-3">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</td></tr>;
    })}</tbody></table></div>{history.assessments.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No weekly assessment history.</p>}</CardContent></Card>
  </div>;
}
