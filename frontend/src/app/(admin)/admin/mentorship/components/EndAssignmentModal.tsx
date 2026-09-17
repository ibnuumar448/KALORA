import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface EndAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  studentName: string;
  currentMentorName: string;
  onSuccess: () => void;
}

export function EndAssignmentModal({ open, onOpenChange, assignmentId, studentName, currentMentorName, onSuccess }: EndAssignmentModalProps) {
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setNotes('');
    }
  }, [open]);

  const handleEnd = async () => {
    if (!reason) return;
    
    setSubmitting(true);
    try {
      await api.post(`/mentorship/assignments/${assignmentId}/end`, {
        reason,
        notes
      });
      toast.success(`Ended assignment for ${studentName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to end assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    "Mentor left the programme",
    "Mentor suspended",
    "Student withdrawn",
    "Programme restructuring",
    "Temporary reassignment",
    "Other"
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-2">End Assignment</h2>
        <p className="text-sm text-slate-500 mb-4">
          Remove {studentName} from {currentMentorName}'s mentorship. This student will return to the Unassigned list.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label>Reason for Ending</Label>
            <select 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a reason...</option>
              {reasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Input 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="e.g. Mentor on long-term leave"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleEnd} disabled={!reason || submitting}>
            {submitting ? 'Processing...' : 'End Assignment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
