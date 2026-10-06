import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AssessmentCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssessmentCreateModal({ open, onOpenChange, onSuccess }: AssessmentCreateModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'quiz',
    duration_minutes: 30,
    passing_score: 50,
    cohort_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: ''
  });
  
  const [subjectConfig, setSubjectConfig] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      api.get('/curriculum/subjects').then(res => setSubjects(res.data)).catch(console.error);
      api.get('/curriculum/cohorts').then(res => setCohorts(res.data)).catch(console.error);
      api.get('/question-bank').then(res => setQuestionBank(res.data)).catch(console.error);
      setStep(1);
      setFormData({
        name: '',
        type: 'quiz',
        duration_minutes: 30,
        passing_score: 50,
        cohort_id: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: ''
      });
      setSubjectConfig({});
    }
  }, [open]);

  if (!open) return null;

  const totalQuestions = Object.values(subjectConfig).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    
    if (totalQuestions === 0) {
      toast.error("You must add at least one question.");
      return;
    }

    setSubmitting(true);

    try {
      // Gather question IDs based on subject config (MVP: just pick first N questions per subject)
      let selectedQuestionIds: string[] = [];
      for (const [subjectId, count] of Object.entries(subjectConfig)) {
        if (count > 0) {
          const subjectQuestions = questionBank.filter(q => q.subject_id === subjectId);
          selectedQuestionIds = selectedQuestionIds.concat(
            subjectQuestions.slice(0, count).map(q => q.id)
          );
        }
      }

      const payload = {
        name: formData.name,
        type: formData.type,
        duration_minutes: Number(formData.duration_minutes),
        passing_score: Number(formData.passing_score),
        cohort_id: formData.cohort_id || null,
        start_date: (formData.start_date && formData.start_time) ? new Date(`${formData.start_date}T${formData.start_time}`).toISOString() : null,
        end_date: (formData.end_date && formData.end_time) ? new Date(`${formData.end_date}T${formData.end_time}`).toISOString() : null,
        question_ids: selectedQuestionIds
      };

      await api.post('/assessments', payload);
      toast.success("Assessment created successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableQuestions = (subjectId: string) => {
    return questionBank.filter(q => q.subject_id === subjectId).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Assessment</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase">1. Assessment Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Assessment Name</label>
                  <input type="text" required className="w-full border rounded p-2 text-sm" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Week 1 Math & Physics" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="w-full border rounded p-2 text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="quiz">Quiz</option>
                    <option value="weekly">Weekly Assessment</option>
                    <option value="monthly">Monthly Assessment</option>
                    <option value="mock">Mock Exam</option>
                    <option value="final">Final Exam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Cohort (Optional)</label>
                  <select className="w-full border rounded p-2 text-sm" value={formData.cohort_id} onChange={e => setFormData({...formData, cohort_id: e.target.value})}>
                    <option value="">All Students (No specific cohort)</option>
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Minutes)</label>
                  <input type="number" required min="1" className="w-full border rounded p-2 text-sm" 
                    value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-slate-800">Scheduling (Optional)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Date</label>
                    <input type="date" className="w-full border rounded p-1.5 text-sm" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Time</label>
                    <input type="time" className="w-full border rounded p-1.5 text-sm" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">End Date</label>
                    <input type="date" className="w-full border rounded p-1.5 text-sm" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End Time</label>
                    <input type="time" className="w-full border rounded p-1.5 text-sm" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase">2. Select Subjects & Questions</h3>
              <p className="text-sm text-slate-500">Configure how many questions you want to pull from the bank for each subject.</p>
              
              <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                {subjects.map(s => {
                  const available = getAvailableQuestions(s.id);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">{available} questions available in bank</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Include:</label>
                        <input 
                          type="number" 
                          min="0" 
                          max={available}
                          value={subjectConfig[s.id] || 0}
                          onChange={(e) => setSubjectConfig({...subjectConfig, [s.id]: parseInt(e.target.value) || 0})}
                          className="w-20 border rounded p-1 text-center"
                          disabled={available === 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-primary-light border border-blue-100 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-emerald-900">Total Assessment Questions:</span>
                <span className="text-xl font-bold text-primary-hover">{totalQuestions}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-4 border-t">
            {step === 2 ? (
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={submitting}>Back</Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            )}
            
            {step === 1 ? (
              <Button type="submit">Next: Configure Subjects</Button>
            ) : (
              <Button type="submit" disabled={submitting || totalQuestions === 0}>
                {submitting ? 'Publishing...' : 'Publish Assessment'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
