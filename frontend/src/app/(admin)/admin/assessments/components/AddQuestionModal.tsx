import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AddQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddQuestionModal({ open, onOpenChange, onSuccess }: AddQuestionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    subject_id: '',
    text: '',
    correct_answer: '',
    difficulty: 'medium'
  });

  useEffect(() => {
    if (open) {
      api.get('/curriculum/subjects').then(res => {
        setSubjects(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({...prev, subject_id: res.data[0].id}));
        }
      }).catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        options: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' }
        ] // MVP dummy options
      };
      
      await api.post('/question-bank', payload);
      toast.success("Question added successfully!");
      onSuccess();
      onOpenChange(false);
      setFormData({...formData, text: '', correct_answer: ''});
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Add Single Question</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select required className="w-full border rounded-md p-2 text-sm" 
              value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})}>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Question Text</label>
            <textarea required rows={3} className="w-full border rounded-md p-2 text-sm" 
              value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} placeholder="What is 2 + 2?" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Correct Answer</label>
              <input type="text" required className="w-full border rounded-md p-2 text-sm" 
                value={formData.correct_answer} onChange={e => setFormData({...formData, correct_answer: e.target.value})} placeholder="e.g. 4" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select required className="w-full border rounded-md p-2 text-sm" 
                value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Add Question</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
