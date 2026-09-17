import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ReviewMakeupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any | null;
  onSuccess: () => void;
}

export function ReviewMakeupModal({ open, onOpenChange, request, onSuccess }: ReviewMakeupModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  if (!open || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = { status };
      
      if (status === 'approved') {
        if (!startDate || !startTime || !endDate || !endTime) {
          toast.error("Start and end times are required for approval");
          setSubmitting(false);
          return;
        }
        
        payload.makeup_start_at = new Date(`${startDate}T${startTime}`).toISOString();
        payload.makeup_end_at = new Date(`${endDate}T${endTime}`).toISOString();
      }

      await api.post(`/assessments/makeup-requests/${request.id}/review`, payload);
      toast.success(`Request ${status} successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to review request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Review Makeup Request</h2>
        
        <div className="mb-4 text-sm">
          <p><span className="font-semibold">Student:</span> {request.student_name} ({request.student_admission_no})</p>
          <p><span className="font-semibold">Assessment:</span> {request.assessment_name}</p>
          <div className="mt-2 p-3 bg-slate-50 rounded-md border text-slate-700">
            <span className="font-semibold block mb-1">Reason provided:</span>
            {request.reason}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Decision</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="approved">Approve Request</option>
              <option value="rejected">Reject Request</option>
            </select>
          </div>

          {status === 'approved' && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900">Custom Makeup Window</h3>
              <p className="text-xs text-blue-700 mb-2">Only this student will have access during this time.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Start Date</label>
                  <input type="date" required className="w-full border rounded p-1.5 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Start Time</label>
                  <input type="time" required className="w-full border rounded p-1.5 text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">End Date</label>
                  <input type="date" required className="w-full border rounded p-1.5 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">End Time</label>
                  <input type="time" required className="w-full border rounded p-1.5 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Submit Review</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
