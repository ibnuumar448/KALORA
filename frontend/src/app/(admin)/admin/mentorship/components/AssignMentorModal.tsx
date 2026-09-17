import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AssignMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentIds: string[];
  onSuccess: () => void;
}

export function AssignMentorModal({ open, onOpenChange, selectedStudentIds, onSuccess }: AssignMentorModalProps) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/mentorship/mentors').then(res => setMentors(res.data)).catch(() => toast.error('Failed to load mentors'));
      setSelectedMentorId('');
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedMentorId) return;
    
    setSubmitting(true);
    try {
      await api.post('/mentorship/assign', {
        student_ids: selectedStudentIds,
        mentor_id: selectedMentorId
      });
      toast.success(`Successfully assigned ${selectedStudentIds.length} student(s)`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to assign students");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedMentor = mentors.find(m => m.id === selectedMentorId);
  const resultingAssigned = selectedMentor ? selectedMentor.assigned_count + selectedStudentIds.length : 0;
  const isOverCapacity = selectedMentor && resultingAssigned > selectedMentor.capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-2">Assign Mentor</h2>
        <p className="text-sm text-slate-500 mb-4">
          Assigning {selectedStudentIds.length} selected student(s) to a mentor.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Mentor</label>
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

          {selectedMentor && (
            <div className="p-3 bg-slate-50 border rounded-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Assigned:</span>
                <span className="font-medium">{selectedMentor.assigned_count} / {selectedMentor.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Students Being Added:</span>
                <span className="font-medium">+{selectedStudentIds.length}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-slate-700 font-medium">Resulting Assignment:</span>
                <span className={`font-bold ${isOverCapacity ? 'text-red-600' : 'text-slate-900'}`}>
                  {resultingAssigned} / {selectedMentor.capacity}
                </span>
              </div>
              {isOverCapacity && (
                <p className="text-xs text-red-600 mt-2 font-medium">Warning: This assignment exceeds the mentor's normal capacity.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedMentorId || submitting}>
            {submitting ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
