"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Question = { id: string; text: string; options: Array<string | { id: string; text: string }>; selected_answer?: string | null };
type AttemptData = {
  id: string; status: string; score?: number | null; started_at: string; deadline_at?: string | null;
  remaining_seconds?: number | null; questions: Question[];
};
type Assessment = {
  id: string; name: string; type: string; subject_name?: string; topic_names?: string[];
  question_count: number; duration_minutes?: number; passing_score: number; status: string;
  display_status?: string; start_date?: string | null; end_date?: string | null;
  lifecycle_status?: string;
  release_results_at?: string | null;
  is_makeup?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    return typeof detail === 'string' ? detail : fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function AssessmentAttemptPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmStart, setConfirmStart] = useState(false);
  const [active, setActive] = useState(false);
  const [completed, setCompleted] = useState(false);
  const saveQueues = useRef<Record<string, Promise<unknown>>>({});
  const submissionInFlight = useRef(false);
  const pendingSaves = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, currentResponse] = await Promise.all([
        api.get('/assessments/my-assignments'),
        api.get(`/assessments/${id}/current-attempt`),
      ]);
      const found = assignmentResponse.data.find((item: Assessment) => item.id === id);
      if (!found) throw new Error('This assessment is not assigned to your account.');
      setAssessment(found);
      const savedAttempt = currentResponse.data.attempt as AttemptData | null;
      if (savedAttempt?.status === 'in_progress') {
        setAttempt(savedAttempt);
        setAnswers(Object.fromEntries(savedAttempt.questions.filter(q => q.selected_answer).map(q => [q.id, q.selected_answer as string])));
        setRemaining(savedAttempt.remaining_seconds ?? null);
        setActive(true);
      } else if (savedAttempt) {
        setAttempt(savedAttempt);
        setCompleted(true);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to load this assessment.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = useCallback(async (automatic = false) => {
    if (!attempt || submissionInFlight.current || completed) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post(`/attempts/${attempt.id}/submit`, { answers: [] });
      setAttempt(response.data);
      setCompleted(true);
      setActive(false);
      if (automatic) toast.message('Time expired. Your saved answers were submitted automatically.');
      else toast.success('Assessment submitted.');
    } catch (err: unknown) {
      for (let retry = 0; retry < 3; retry += 1) {
        try {
          const latest = await api.get(`/attempts/${attempt.id}`);
          if (latest.data.status === 'auto_submitted' || latest.data.status === 'completed') {
            setAttempt(latest.data);
            setCompleted(true);
            setActive(false);
            if (automatic) toast.message('Time expired. Your saved answers were submitted automatically.');
            return;
          }
          await api.post(`/attempts/${attempt.id}/submit`, { answers: [] });
          setCompleted(true);
          setActive(false);
          return;
        } catch {
          if (retry === 2) break;
          await new Promise(resolve => window.setTimeout(resolve, 800 * (retry + 1)));
        }
      }
      setError(getErrorMessage(err, 'Submission failed. Your saved answers are still available; retry when connected.'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }, [attempt, completed]);

  useEffect(() => {
    if (!active || remaining === null) return;
    if (remaining <= 0) {
      const expiryTimer = window.setTimeout(() => { void submit(true); }, 0);
      return () => window.clearTimeout(expiryTimer);
    }
    const timer = window.setTimeout(() => setRemaining(value => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [active, remaining, submit]);

  const saveAnswer = async (questionId: string, answer: string) => {
    setAnswers(previous => ({ ...previous, [questionId]: answer }));
    pendingSaves.current += 1;
    setSaveState('saving');
    const previousSave = saveQueues.current[questionId] || Promise.resolve();
    const currentSave = previousSave.catch(() => undefined).then(() => api.put(`/attempts/${attempt?.id}/answers/${questionId}`, { selected_answer: answer }));
    saveQueues.current[questionId] = currentSave;
    try {
      await currentSave;
      pendingSaves.current = Math.max(0, pendingSaves.current - 1);
      if (saveQueues.current[questionId] === currentSave) {
        setSaveState(pendingSaves.current ? 'saving' : 'saved');
        setError('');
      }
    } catch (err: unknown) {
      pendingSaves.current = Math.max(0, pendingSaves.current - 1);
      if (saveQueues.current[questionId] === currentSave) {
        setSaveState(pendingSaves.current ? 'saving' : 'failed');
        setError(getErrorMessage(err, 'Answer could not be saved. Check your connection and select the answer again to retry.'));
      }
    }
  };

  const start = async () => {
    if (!assessment) return;
    setStarting(true);
    setError('');
    try {
      const response = await api.post(`/assessments/${id}/attempts`, { is_makeup: assessment.status === 'makeup_approved' });
      setAttempt(response.data);
      setAnswers(Object.fromEntries(response.data.questions.filter((q: Question) => q.selected_answer).map((q: Question) => [q.id, q.selected_answer as string])));
      setRemaining(response.data.remaining_seconds ?? null);
      setConfirmStart(false);
      setActive(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not start assessment.'));
      if (axios.isAxiosError(err) && err.response?.status === 409) await load();
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl p-6 text-slate-500">Loading assessment...</div>;
  if (error && !assessment) return <div className="mx-auto max-w-4xl space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><div className="flex gap-2"><Button variant="outline" onClick={() => { setLoading(true); void load(); }}>Retry</Button><Link href="/dashboard/assessments"><Button variant="outline">Back to assessments</Button></Link></div></div>;
  if (!assessment) return null;

  if (completed) {
    const released = !assessment.release_results_at || new Date(assessment.release_results_at) <= new Date();
    return <div className="mx-auto max-w-2xl space-y-5 p-6">
      <Link href="/dashboard/assessments"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back to assessments</Button></Link>
      <Card><CardHeader><CardTitle>Assessment submitted successfully</CardTitle><CardDescription>{assessment.name}</CardDescription></CardHeader>
        <CardContent>{released ? <p>Your result is ready.</p> : <p>Your result will be available when assessment results are released.</p>}
          {released && <Button className="mt-4" onClick={() => router.push(`/dashboard/assessments/${id}/results`)}>View result</Button>}
        </CardContent>
      </Card>
    </div>;
  }

  if (!active || !attempt) return <div className="mx-auto max-w-3xl space-y-5 p-6">
    <Link href="/dashboard/assessments"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back to assessments</Button></Link>
    <Card><CardHeader><CardTitle>{assessment.name}</CardTitle><CardDescription>{assessment.subject_name || 'Assessment'}{assessment.topic_names?.length ? ` · ${assessment.topic_names.join(', ')}` : ''}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3"><p>{assessment.question_count} questions</p><p>{assessment.duration_minutes} minutes</p><p>Pass: {assessment.passing_score}%</p></div>
        {assessment.start_date && <p className="text-sm text-slate-600">Available {new Date(assessment.start_date).toLocaleString()} to {assessment.end_date ? new Date(assessment.end_date).toLocaleString() : 'until further notice'}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button onClick={() => setConfirmStart(true)} disabled={assessment.display_status === 'upcoming' || assessment.lifecycle_status !== 'published'}>Start Assessment</Button>
      </CardContent>
    </Card>
    {confirmStart && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <Card className="w-full max-w-md"><CardHeader><CardTitle id="start-title">Start this assessment?</CardTitle><CardDescription>You are about to begin this assessment. You have one attempt. Duration: {assessment.duration_minutes} minutes. Once submitted, it cannot be restarted.</CardDescription></CardHeader>
        <CardContent className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmStart(false)} disabled={starting}>Cancel</Button><Button onClick={start} disabled={starting}>{starting ? 'Starting...' : 'Start Assessment'}</Button></CardContent>
      </Card>
    </div>}
  </div>;

  const question = attempt.questions[current];
  if (!question) return <div className="p-6">This assessment has no available questions.</div>;
  const answered = new Set(Object.keys(answers));

  return <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold text-slate-900">{assessment.name}</h1><p className="text-sm text-slate-500">Question {current + 1} of {attempt.questions.length}</p></div>
      <div className={`flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-lg ${remaining !== null && remaining < 60 ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-800'}`} aria-live="polite"><Clock className="h-4 w-4" />{remaining === null ? '--:--' : formatRemaining(remaining)}</div>
    </div>
    <div className="flex items-center justify-between text-xs text-slate-500" aria-live="polite"><span>{saveState === 'saving' ? 'Saving...' : saveState === 'failed' ? 'Not saved' : 'Saved'}</span>{saveState === 'saved' && <Check className="h-4 w-4 text-green-700" />}</div>
    {error && <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
      <Card><CardHeader><CardTitle className="text-base">{question.text}</CardTitle></CardHeader><CardContent className="space-y-2">
        {question.options.map((option, index) => { const value = typeof option === 'string' ? option : option.id; const label = typeof option === 'string' ? option : option.text; return <label key={`${question.id}-${index}`} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-slate-50"><input type="radio" name={question.id} checked={answers[question.id] === value} onChange={() => saveAnswer(question.id, value)} className="mt-1" /><span>{label}</span></label>; })}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Questions</CardTitle></CardHeader><CardContent><div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
        {attempt.questions.map((item, index) => <button key={item.id} type="button" aria-label={`Question ${index + 1}${answered.has(item.id) ? ', answered' : ', unanswered'}`} aria-current={current === index ? 'step' : undefined} onClick={() => setCurrent(index)} className={`aspect-square rounded border text-sm ${current === index ? 'border-green-700 bg-green-50 font-semibold text-green-800' : answered.has(item.id) ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-700'}`}>{index + 1}</button>)}
      </div><p className="mt-3 text-xs text-slate-500">{answered.size} answered · {attempt.questions.length - answered.size} unanswered</p></CardContent></Card>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => setCurrent(value => Math.max(0, value - 1))} disabled={current === 0}>Previous</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setCurrent(value => Math.min(attempt.questions.length - 1, value + 1))} disabled={current === attempt.questions.length - 1}>Next</Button><Button onClick={() => submit()} disabled={submitting || saveState !== 'saved'}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting</> : 'Submit Assessment'}</Button></div></div>
  </div>;
}
