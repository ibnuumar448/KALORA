"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Result = { released: boolean; assessment_name: string; release_results_at?: string | null; passing_score?: number; score?: number; passed?: boolean; question_count?: number; answered_count?: number; correct_count?: number; incorrect_count?: number; submitted_at?: string; questions?: Array<{ id: string; text: string; options: Array<string | { id: string; text: string }>; selected_answer?: string | null; correct_answer?: string; is_correct?: boolean | null; explanation?: string | null }> };

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get(`/assessments/${id}/results`).then(response => setResult(response.data)).catch(err => setError(err.response?.data?.detail || 'Results could not be loaded.')).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);
  if (loading) return <div className="mx-auto max-w-4xl p-6 text-slate-500">Loading results...</div>;
  if (error) return <div className="mx-auto max-w-4xl space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link href="/dashboard/assessments"><Button variant="outline">Back to assessments</Button></Link></div>;
  if (!result) return null;
  return <div className="mx-auto max-w-4xl space-y-5 p-6">
    <Link href="/dashboard/assessments"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4"/>Back to assessments</Button></Link>
    {!result.released ? <Card><CardHeader><CardTitle>Assessment submitted successfully.</CardTitle><CardDescription>{result.assessment_name}</CardDescription></CardHeader><CardContent><p>Your result will be available when assessment results are released.</p>{result.release_results_at && <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4"/>Expected {new Date(result.release_results_at).toLocaleString()}</p>}</CardContent></Card> : <>
      <div><h1 className="text-2xl font-bold text-slate-900">{result.assessment_name}</h1><p className="mt-1 text-sm text-slate-500">Assessment result</p></div>
      <Card><CardContent className="grid gap-5 p-6 sm:grid-cols-2"><div><p className="text-sm text-slate-500">Score</p><p className="mt-1 text-3xl font-bold text-slate-900">{(result.score || 0).toFixed(1)}%</p><p className="mt-1 text-sm">{result.correct_count} / {result.question_count} correct</p></div><div className="flex items-center gap-3">{result.passed ? <CheckCircle className="h-8 w-8 text-green-700"/> : <XCircle className="h-8 w-8 text-red-700"/>}<div><p className="font-semibold">{result.passed ? 'Passed' : 'Not passed'}</p><p className="text-sm text-slate-500">Passing score: {result.passing_score}%</p></div></div><p className="text-sm text-slate-600">Questions answered: {result.answered_count}/{result.question_count}</p><p className="text-sm text-slate-600">Submitted: {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A'}</p></CardContent></Card>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Answer review</h2>{result.questions?.map((question, index) => <Card key={question.id}><CardHeader><CardTitle className="text-base">{index + 1}. {question.text}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className={question.is_correct ? 'text-green-800' : 'text-red-800'}>{question.is_correct ? 'Correct' : 'Incorrect'} · Your answer: {question.selected_answer || 'Not answered'}</p><p className="text-slate-700">Correct answer: {question.correct_answer}</p>{question.explanation && <p className="text-slate-500">{question.explanation}</p>}</CardContent></Card>)}</section>
    </>}
  </div>;
}
