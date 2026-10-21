import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ open, onOpenChange, onSuccess }: BulkUploadModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<Array<Record<string, unknown>>>([]);

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      setPreview(data);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview.length === 0) {
      toast.error("No valid questions found in file.");
      return;
    }
    
    setSubmitting(true);
    try {
      const getValue = (row: Record<string, unknown>, key: string, alternate: string) => row[key] ?? row[alternate];
      const payloadQuestions = preview.map(row => ({
        subject: String(getValue(row, 'subject', 'Subject') ?? '').trim(),
        topic: String(getValue(row, 'topic', 'Topic') ?? '').trim() || null,
        text: String(getValue(row, 'question', 'Question') ?? '').trim(),
        difficulty: String(getValue(row, 'difficulty', 'Difficulty') ?? 'medium').trim(),
        correct_answer: String(getValue(row, 'correct_answer', 'Correct_Answer') ?? 'A').trim().toUpperCase(),
        options: [
          { id: 'A', text: String(getValue(row, 'option_a', 'Option_A') ?? '').trim() },
          { id: 'B', text: String(getValue(row, 'option_b', 'Option_B') ?? '').trim() },
          { id: 'C', text: String(getValue(row, 'option_c', 'Option_C') ?? '').trim() },
          { id: 'D', text: String(getValue(row, 'option_d', 'Option_D') ?? '').trim() }
        ]
      }));

      // Validate on frontend before sending
      for (let i = 0; i < payloadQuestions.length; i++) {
        const q = payloadQuestions[i];
        if (!q.subject || !q.text || q.options.some(option => !option.text)) {
          toast.error(`Row ${i+2}: Missing subject, question, or one or more option texts.`);
          setSubmitting(false);
          return;
        }
      }

      await api.post('/question-bank/bulk-upload', { questions: payloadQuestions });
      toast.success(`Successfully uploaded ${payloadQuestions.length} questions!`);
      onSuccess();
      onOpenChange(false);
      setPreview([]);
    } catch (error: unknown) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      toast.error(typeof detail === 'string' ? detail : 'Failed to bulk upload questions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Bulk Upload Questions</h2>
        
        <div className="bg-slate-50 p-4 border rounded-md mb-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-2">Required Excel/CSV Format:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>subject</strong> (Must match an existing subject in the system)</li>
            <li><strong>topic</strong> (Optional; must match a topic under the selected subject)</li>
            <li><strong>difficulty</strong> (e.g., Easy, Medium, Hard)</li>
            <li><strong>question</strong></li>
            <li><strong>option_a</strong>, <strong>option_b</strong>, <strong>option_c</strong>, <strong>option_d</strong></li>
            <li><strong>correct_answer</strong> (A, B, C, or D)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Excel or CSV File</label>
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="w-full border rounded-md p-2 text-sm"
              required
            />
          </div>
          
          {preview.length > 0 && (
            <div className="text-sm text-primary-hover bg-primary-light p-3 rounded border border-blue-100">
              Successfully parsed <strong>{preview.length}</strong> questions from file.
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || preview.length === 0}>
              {submitting ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
