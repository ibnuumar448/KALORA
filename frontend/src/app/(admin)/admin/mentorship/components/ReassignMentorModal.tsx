import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ReassignMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  studentName: string;
  currentMentorName: string;
  onSuccess: () => void;
}

export function ReassignMentorModal({ open, onOpenChange, assignmentId, studentName, currentMentorName, onSuccess }: ReassignMentorModalProps) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/mentorship/mentors').then(res => setMentors(res.data)).catch(() => toast.error('Failed to load mentors'));
      setSelectedMentorId('');
      setReason('');
      setNotes('');
    }
  }, [open]);

  const handleReassign = async () => {
    if (!selectedMentorId || !reason) return;
    
    setSubmitting(true);
    try {
      await api.post(`/mentorship/assignments/${assignmentId}/reassign`, {
        new_mentor_id: selectedMentorId,
        reason,
        notes
      });
      toast.success(`Successfully reassigned ${studentName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reassign student");
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    "Mentor unavailable",
    "Student requires reassignment",
    "Programme restructuring",
    "Capacity adjustment",
    "Conflict or incompatibility",
    "Other"
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-2">Reassign Student</h2>
        <p className="text-sm text-slate-500 mb-4">
          Move {studentName} from {currentMentorName} to a new mentor.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label>Select New Mentor</Label>
            <select 
              value={selectedMentorId} 
              onChange={e => setSelectedMentorId(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a mentor...</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.assigned_count}/{m.capacity} students)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Reason for Reassignment</Label>
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
              placeholder="e.g. Requested by student on 12/08"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleReassign} disabled={!selectedMentorId || !reason || submitting}>
            {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
