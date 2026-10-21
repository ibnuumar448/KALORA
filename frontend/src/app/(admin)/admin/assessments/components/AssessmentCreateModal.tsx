"use client";

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Subject = { id: string; name: string; modules?: Array<{ id: string; name: string; topics?: Array<{ id: string; name: string }> }> };
type Question = { id: string; text: string; options: Array<string | { id: string; text: string }>; correct_answer: string; subject_id: string; subject_name: string; topic_id?: string | null; topic_name?: string | null; difficulty?: string };
type Cohort = { id: string; name: string };
type AssessmentForm = { name: string; type: string; subject_id: string; topic_ids: string[]; cohort_id: string; duration_minutes: number; passing_score: number; start_date: string; start_time: string; end_date: string; end_time: string; release_date: string; release_time: string; question_ids: string[] };

const emptyForm = (): AssessmentForm => ({ name: '', type: 'weekly', subject_id: '', topic_ids: [], cohort_id: '', duration_minutes: 30, passing_score: 50, start_date: '', start_time: '', end_date: '', end_time: '', release_date: '', release_time: '', question_ids: [] });
const localDateTime = (date: string, time: string) => date && time ? new Date(`${date}T${time}`).toISOString() : null;
const apiDateTime = (value?: string | null) => value ? new Date(value).toISOString() : '';
const datePart = (value?: string | null) => apiDateTime(value).slice(0, 10);
const timePart = (value?: string | null) => apiDateTime(value).slice(11, 16);
const errorText = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Assessment could not be saved.';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; assessmentId?: string | null; }

export function AssessmentCreateModal({ open, onOpenChange, onSuccess, assessmentId }: Props) {
  const [step, setStep] = useState<'settings' | 'questions' | 'preview'>('settings');
  const [form, setForm] = useState<AssessmentForm>(emptyForm);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(assessmentId || null);
  const [isDraft, setIsDraft] = useState(true);

  useEffect(() => {
    if (!open) return;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    let cancelled = false;
    Promise.all([api.get('/curriculum/subjects'), api.get('/curriculum/cohorts'), api.get('/question-bank')])
      .then(async ([subjectResponse, cohortResponse, questionResponse]) => {
        if (cancelled) return;
        setSubjects(subjectResponse.data);
        setCohorts(cohortResponse.data);
        setQuestions(questionResponse.data);
        if (assessmentId) {
          const response = await api.get(`/assessments/${assessmentId}`);
          if (cancelled) return;
          const item = response.data;
          setSavedId(assessmentId);
          setIsDraft(item.status === 'draft');
          setForm({
            name: item.name, type: item.type, subject_id: item.subject_id || '', topic_ids: item.topic_ids || [], cohort_id: item.cohort_id || '',
            duration_minutes: item.duration_minutes || 30, passing_score: item.passing_score, start_date: datePart(item.start_date), start_time: timePart(item.start_date),
            end_date: datePart(item.end_date), end_time: timePart(item.end_date), release_date: datePart(item.release_results_at), release_time: timePart(item.release_results_at), question_ids: item.question_ids || [],
          });
        } else {
          setSavedId(null);
          setIsDraft(true);
          setForm(emptyForm());
        }
        setStep('settings');
      })
      .catch(() => { if (!cancelled) toast.error('Could not load assessment setup data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(loadingTimer); };
  }, [open, assessmentId]);

  const selectedSubject = subjects.find(subject => subject.id === form.subject_id);
  const topics = selectedSubject?.modules?.flatMap(module => module.topics || []) || [];
  const availableQuestions = useMemo(() => questions.filter(question => question.subject_id === form.subject_id && (!form.topic_ids.length || (question.topic_id && form.topic_ids.includes(question.topic_id)))), [questions, form.subject_id, form.topic_ids]);
  const selectedQuestions = availableQuestions.filter(question => form.question_ids.includes(question.id));

  const payload = () => ({
    name: form.name.trim(), type: form.type, subject_id: form.subject_id || null, topic_ids: form.topic_ids,
    cohort_id: form.cohort_id || null, duration_minutes: Number(form.duration_minutes), passing_score: Number(form.passing_score),
    start_date: localDateTime(form.start_date, form.start_time), end_date: localDateTime(form.end_date, form.end_time),
    release_results_at: localDateTime(form.release_date, form.release_time), question_ids: form.question_ids,
  });

  const scheduleIsValid = ((!form.start_date && !form.start_time) || Boolean(form.start_date && form.start_time))
    && ((!form.end_date && !form.end_time) || Boolean(form.end_date && form.end_time))
    && ((!form.release_date && !form.release_time) || Boolean(form.release_date && form.release_time))
    && (!form.start_date || !form.end_date || new Date(`${form.end_date}T${form.end_time}`) > new Date(`${form.start_date}T${form.start_time}`));

  const saveDraft = async () => {
    setSaving(true);
    try {
      const data = payload();
      if (savedId) await api.put(`/assessments/${savedId}`, data);
      else {
        const response = await api.post('/assessments', data);
        setSavedId(response.data.id);
      }
      setIsDraft(true);
      toast.success('Draft saved.');
      onSuccess();
    } catch (error: unknown) { toast.error(errorText(error)); }
    finally { setSaving(false); }
  };

  const publish = async () => {
    if (!savedId) return;
    if (!window.confirm('Publish this assessment and assign it to eligible students in the selected cohort? This cannot be undone.')) return;
    setSaving(true);
    try {
      await api.post(`/assessments/${savedId}/publish`);
      setIsDraft(false);
      toast.success('Assessment published.');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) { toast.error(errorText(error)); }
    finally { setSaving(false); }
  };

  const toggleQuestion = (questionId: string) => setForm(previous => ({ ...previous, question_ids: previous.question_ids.includes(questionId) ? previous.question_ids.filter(id => id !== questionId) : [...previous.question_ids, questionId] }));
  const toggleTopic = (topicId: string) => setForm(previous => {
    const topicIds = previous.topic_ids.includes(topicId) ? previous.topic_ids.filter(id => id !== topicId) : [...previous.topic_ids, topicId];
    const validQuestionIds = questions.filter(question => question.subject_id === previous.subject_id && (!topicIds.length || (question.topic_id && topicIds.includes(question.topic_id)))).map(question => question.id);
    return { ...previous, topic_ids: topicIds, question_ids: previous.question_ids.filter(id => validQuestionIds.includes(id)) };
  });

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="assessment-editor-title">
    <div className="my-5 w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 id="assessment-editor-title" className="text-xl font-bold text-slate-900">{savedId ? 'Edit Assessment Draft' : 'Create Weekly Assessment'}</h2><p className="mt-1 text-sm text-slate-500">{step === 'settings' ? 'Assessment settings' : step === 'questions' ? 'Choose questions' : 'Review student preview'}</p></div><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div>
      {loading ? <p className="py-12 text-center text-slate-500">Loading assessment setup...</p> : !isDraft ? <div className="py-10 text-center"><p className="text-slate-700">Published assessments are locked to protect existing attempts.</p></div> : <>
        {step === 'settings' && <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Assessment title<input className="mt-1 w-full rounded-md border p-2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label>
            <label className="text-sm font-medium">Type<select className="mt-1 w-full rounded-md border p-2" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="weekly">Weekly Assessment</option><option value="quiz">Quiz</option><option value="monthly">Monthly Assessment</option><option value="mock">Mock Exam</option><option value="final">Final Exam</option></select></label>
            <label className="text-sm font-medium">Subject<select className="mt-1 w-full rounded-md border p-2" value={form.subject_id} onChange={event => setForm({ ...form, subject_id: event.target.value, topic_ids: [], question_ids: [] })} required><option value="">Select subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label className="text-sm font-medium">Cohort<select className="mt-1 w-full rounded-md border p-2" value={form.cohort_id} onChange={event => setForm({ ...form, cohort_id: event.target.value })} required><option value="">Select cohort</option>{cohorts.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
            <label className="text-sm font-medium">Duration (minutes)<input type="number" min="1" className="mt-1 w-full rounded-md border p-2" value={form.duration_minutes} onChange={event => setForm({ ...form, duration_minutes: Number(event.target.value) })} /></label>
            <label className="text-sm font-medium">Passing score (%)<input type="number" min="0" max="100" className="mt-1 w-full rounded-md border p-2" value={form.passing_score} onChange={event => setForm({ ...form, passing_score: Number(event.target.value) })} /></label>
          </div>
          {topics.length > 0 && <fieldset><legend className="mb-2 text-sm font-medium">Topics covered</legend><div className="grid gap-2 sm:grid-cols-2">{topics.map(topic => <label key={topic.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.topic_ids.includes(topic.id)} onChange={() => toggleTopic(topic.id)} />{topic.name}</label>)}</div></fieldset>}
          <fieldset className="rounded-md border p-4"><legend className="px-1 text-sm font-medium">Availability window</legend><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Start date/time<div className="mt-1 flex gap-2"><input aria-label="Start date" type="date" className="min-w-0 flex-1 rounded border p-2" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /><input aria-label="Start time" type="time" className="w-28 rounded border p-2" value={form.start_time} onChange={event => setForm({ ...form, start_time: event.target.value })} /></div></label><label className="text-xs">End date/time<div className="mt-1 flex gap-2"><input aria-label="End date" type="date" className="min-w-0 flex-1 rounded border p-2" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /><input aria-label="End time" type="time" className="w-28 rounded border p-2" value={form.end_time} onChange={event => setForm({ ...form, end_time: event.target.value })} /></div></label></div></fieldset>
          <fieldset className="rounded-md border p-4"><legend className="px-1 text-sm font-medium">Result release</legend><div className="flex gap-2"><input aria-label="Result release date" type="date" className="min-w-0 flex-1 rounded border p-2" value={form.release_date} onChange={event => setForm({ ...form, release_date: event.target.value })} /><input aria-label="Result release time" type="time" className="w-32 rounded border p-2" value={form.release_time} onChange={event => setForm({ ...form, release_time: event.target.value })} /></div></fieldset>
          {!scheduleIsValid && <p role="alert" className="text-sm text-red-700">Enter both date and time values, and ensure the availability end is after its start.</p>}
        </div>}
        {step === 'questions' && <div className="mt-5 space-y-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Question bank</h3><span className="text-sm text-slate-500">{form.question_ids.length} selected</span></div><div className="max-h-[55vh] space-y-2 overflow-y-auto">{availableQuestions.length ? availableQuestions.map(question => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-slate-50"><input type="checkbox" className="mt-1" checked={form.question_ids.includes(question.id)} onChange={() => toggleQuestion(question.id)} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{question.text}</span><span className="mt-1 block text-xs text-slate-500">{question.topic_name || 'No topic'} · {question.difficulty || 'Difficulty not set'}</span></span></label>) : <p className="py-8 text-center text-sm text-slate-500">No questions match this subject and topic selection.</p>}</div></div>}
        {step === 'preview' && <div className="mt-5 space-y-4"><div className="rounded-md border bg-slate-50 p-4"><h3 className="text-lg font-semibold">{form.name || 'Untitled assessment'}</h3><p className="text-sm text-slate-600">{selectedSubject?.name || 'Subject not selected'}{form.topic_ids.length ? ` · ${topics.filter(topic => form.topic_ids.includes(topic.id)).map(topic => topic.name).join(', ')}` : ''}</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><p>{form.question_ids.length} questions</p><p>{form.duration_minutes} minutes</p><p>Pass: {form.passing_score}%</p><p>{cohorts.find(cohort => cohort.id === form.cohort_id)?.name || 'No cohort'}</p></div><p className="mt-3 text-xs text-slate-600">Availability: {form.start_date && form.start_time ? new Date(`${form.start_date}T${form.start_time}`).toLocaleString() : 'Immediately after publish'} – {form.end_date && form.end_time ? new Date(`${form.end_date}T${form.end_time}`).toLocaleString() : 'No end date'}</p><p className="text-xs text-slate-600">Results: {form.release_date && form.release_time ? new Date(`${form.release_date}T${form.release_time}`).toLocaleString() : 'Upon submission'}</p></div><div className="max-h-[40vh] space-y-3 overflow-y-auto">{selectedQuestions.map((question, index) => <div key={question.id} className="rounded-md border p-4"><p className="font-medium">{index + 1}. {question.text}</p><ul className="mt-2 space-y-1 pl-5 text-sm text-slate-600">{question.options.map((option, optionIndex) => <li key={optionIndex}>{typeof option === 'string' ? option : `${option.id}. ${option.text}`}</li>)}</ul></div>)}</div></div>}
        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t pt-4"><div className="flex gap-2">{step !== 'settings' && <Button variant="outline" onClick={() => setStep(step === 'preview' ? 'questions' : 'settings')}>Back</Button>}{step === 'preview' && <Button variant="outline" onClick={saveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</Button>}</div><div className="flex gap-2">{step === 'settings' && <Button onClick={() => setStep('questions')} disabled={!form.name.trim() || !form.subject_id || !form.cohort_id || !scheduleIsValid}>Choose Questions</Button>}{step === 'questions' && <Button onClick={() => setStep('preview')} disabled={!form.question_ids.length}>Preview</Button>}{step === 'preview' && <Button onClick={publish} disabled={!savedId || saving || !form.question_ids.length || !scheduleIsValid}>{saving ? 'Publishing...' : 'Publish Assessment'}</Button>}</div></div>
      </>}
    </div>
  </div>;
}
