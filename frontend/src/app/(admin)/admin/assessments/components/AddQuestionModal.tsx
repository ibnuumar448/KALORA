import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Subject = { id: string; name: string; modules?: Array<{ topics?: Array<{ id: string; name: string }> }> };
type Question = { id: string; text: string; subject_id: string; topic_id?: string | null; options: Array<{ id: string; text: string }>; correct_answer: string; difficulty?: string; explanation?: string | null };
interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; question?: Question | null; }
const optionDefaults = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];

export function AddQuestionModal({ open, onOpenChange, onSuccess, question }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [text, setText] = useState('');
  const [options, setOptions] = useState(optionDefaults);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [difficulty, setDifficulty] = useState('medium');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!open) return;
    api.get('/curriculum/subjects').then(response => {
      setSubjects(response.data);
      const initialSubject = question?.subject_id || response.data[0]?.id || '';
      setSubjectId(initialSubject);
      setTopicId(question?.topic_id || '');
    }).catch(() => toast.error('Could not load subjects.'));
    const timer = window.setTimeout(() => {
      setText(question?.text || '');
        const normalizedOptions = question?.options?.map((option, index) => typeof option === 'string' ? { id: String.fromCharCode(65 + index), text: option } : option) || optionDefaults;
        setOptions(normalizedOptions);
        const correctOption = question?.options?.findIndex(option => typeof option === 'string' ? option === question.correct_answer : option.id === question.correct_answer);
        setCorrectAnswer(correctOption != null && correctOption >= 0 ? normalizedOptions[correctOption].id : question?.correct_answer || 'A');
      setDifficulty(question?.difficulty || 'medium');
      setExplanation(question?.explanation || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, question]);
  if (!open) return null;
  const topics = subjects.find(subject => subject.id === subjectId)?.modules?.flatMap(module => module.topics || []) || [];
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (options.some(option => !option.text.trim()) || new Set(options.map(option => option.id)).size !== options.length || !options.some(option => option.id === correctAnswer)) {
      toast.error('Provide every option and choose a valid correct answer.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { subject_id: subjectId, topic_id: topicId || null, text: text.trim(), options, correct_answer: correctAnswer, difficulty, explanation: explanation.trim() || null };
      if (question) await api.put(`/question-bank/${question.id}`, payload);
      else await api.post('/question-bank', payload);
      toast.success(question ? 'Question updated.' : 'Question added.');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      toast.error(typeof detail === 'string' ? detail : 'Question could not be saved.');
    } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true"><div className="my-6 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-bold">{question ? 'Edit Question' : 'Add Question'}</h2><p className="text-sm text-slate-500">Set the options and correct answer.</p></div><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div>
    <form onSubmit={save} className="space-y-4"><label className="block text-sm font-medium">Subject<select required className="mt-1 w-full rounded-md border p-2" value={subjectId} onChange={event => { setSubjectId(event.target.value); setTopicId(''); }}><option value="">Select subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label className="block text-sm font-medium">Topic (optional)<select className="mt-1 w-full rounded-md border p-2" value={topicId} onChange={event => setTopicId(event.target.value)}><option value="">No topic</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <label className="block text-sm font-medium">Question<textarea required rows={3} className="mt-1 w-full rounded-md border p-2" value={text} onChange={event => setText(event.target.value)} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Answer options</legend><div className="grid gap-2 sm:grid-cols-2">{options.map((option, index) => <label key={option.id} className="flex items-center gap-2 text-sm"><span className="w-5 font-semibold">{option.id}</span><input required className="min-w-0 flex-1 rounded-md border p-2" value={option.text} onChange={event => setOptions(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} /></label>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Correct answer<select className="mt-1 w-full rounded-md border p-2" value={correctAnswer} onChange={event => setCorrectAnswer(event.target.value)}>{options.map(option => <option key={option.id} value={option.id}>{option.id}</option>)}</select></label><label className="text-sm font-medium">Difficulty<select className="mt-1 w-full rounded-md border p-2" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
      <label className="block text-sm font-medium">Explanation (optional)<textarea rows={2} className="mt-1 w-full rounded-md border p-2" value={explanation} onChange={event => setExplanation(event.target.value)} /></label>
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="submit" disabled={submitting || !subjectId}>{submitting ? 'Saving...' : question ? 'Save Question' : 'Add Question'}</Button></div>
    </form></div></div>;
}
