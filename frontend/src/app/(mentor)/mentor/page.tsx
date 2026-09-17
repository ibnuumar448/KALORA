"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function MentorDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('General Check-in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/mentors/me/students');
        setStudents(response.data);
      } catch (err: any) {
        console.error('Failed to fetch assigned students', err);
        setError(err.response?.data?.detail || 'Unable to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSaveNote = async () => {
    if (!selectedStudent || !note.trim()) {
      setError('Please enter a note');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      await api.post(`/mentors/me/students/${selectedStudent.student_id}/notes`, {
        contact_attempt: true,
        reason: reason,
        support_given: note,
        follow_up_date: null
      });
      
      setNote('');
      setReason('General Check-in');
      setSelectedStudent(null);
      alert('Intervention note saved successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <p className="animate-pulse">Loading your students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mentor Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage and track your {students.length} assigned students.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle>Assigned Students</CardTitle>
          <CardDescription>{students.length} student(s) assigned in this cohort.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-slate-500 border-t border-dashed border-slate-200 bg-slate-50">
              <p>No students assigned yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Cohort</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{student.email}</td>
                      <td className="px-6 py-4 text-slate-600">Cohort 1</td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-2" />
                          Log Note
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intervention Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl border-0">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Log Intervention</CardTitle>
              <CardDescription>Recording notes for {selectedStudent.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Reason for contact</label>
                <select 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option>Missed Assessment</option>
                  <option>Low Score</option>
                  <option>General Check-in</option>
                  <option>Behavior Concern</option>
                  <option>Attendance Issue</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Support Given</label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  placeholder="Detail the conversation and support provided..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSelectedStudent(null)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSaveNote} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
