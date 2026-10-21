"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

type MentorAssessment = { student_id: string; student_name: string; latest_assessment?: { assessment_name: string; status: string; score?: number | null; passed?: boolean | null; result_released?: boolean } | null };

export default function MentorDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('General Check-in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showMessagingFor, setShowMessagingFor] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [assessmentRows, setAssessmentRows] = useState<MentorAssessment[]>([]);
  const [assessmentError, setAssessmentError] = useState('');

  const fetchMessages = async (assignmentId: string) => {
    if (!assignmentId) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/mentorship/assignments/${assignmentId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenMessaging = async (student: any) => {
    setShowMessagingFor(student);
    fetchMessages(student.assignment_id);
    try {
      await api.post('/notifications/read-type?type=mentorship_message');
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {}
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !showMessagingFor?.assignment_id) return;
    try {
      await api.post(`/mentorship/assignments/${showMessagingFor.assignment_id}/messages`, {
        content: newMessage
      });
      setNewMessage('');
      fetchMessages(showMessagingFor.assignment_id);
    } catch (err) {
      alert("Failed to send message");
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsRes = await api.get('/mentors/me/students');
        setStudents(studentsRes.data);
      } catch (err: any) {
        console.error('Failed to fetch assigned students', err);
        setError(err.response?.data?.detail || 'Unable to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const openNotifiedConversation = (event: Event) => {
      const eventAssignmentId = (event as CustomEvent<{ assignmentId: string }>).detail?.assignmentId;
      const assignmentId = eventAssignmentId || window.sessionStorage.getItem('kalora_pending_mentee_chat') || undefined;
      if (!assignmentId) return;
      const student = students.find(item => item.assignment_id === assignmentId);
      if (!student) return;
      window.sessionStorage.removeItem('kalora_pending_mentee_chat');
      setShowMessagingFor(student);
      void fetchMessages(assignmentId);
    };
    window.addEventListener('openMenteeChat', openNotifiedConversation);
    return () => window.removeEventListener('openMenteeChat', openNotifiedConversation);
  }, [students]);

  useEffect(() => {
    if (!loading && students.length >= 0 && window.sessionStorage.getItem('kalora_pending_mentee_chat')) {
      window.dispatchEvent(new CustomEvent('openMenteeChat', { detail: { assignmentId: window.sessionStorage.getItem('kalora_pending_mentee_chat') } }));
    }
  }, [loading, students]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get('/assessments/mentors/me/assessment-results')
        .then(response => setAssessmentRows(response.data))
        .catch(err => setAssessmentError(err.response?.data?.detail || 'Assessment progress could not be loaded.'));
    }, 0);
    return () => window.clearTimeout(timer);
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
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{student.email}</td>
                      <td className="px-6 py-4 text-slate-600">Cohort 1</td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary-hover hover:bg-primary-light"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-2" />
                          Log Note
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary-hover hover:bg-primary-light"
                          onClick={() => handleOpenMessaging(student)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
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

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle>Weekly Assessment Progress</CardTitle>
          <CardDescription>Latest weekly assessment for your active mentees.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {assessmentError ? <div role="alert" className="p-5 text-sm text-red-700">{assessmentError}</div> : assessmentRows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No weekly assessment activity yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mentee</th><th className="px-5 py-3">Latest assessment</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Result</th><th className="px-5 py-3">History</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{assessmentRows.map(row => {
                  const latest = row.latest_assessment;
                  const submitted = latest && ['submitted', 'auto_submitted', 'makeup_submitted'].includes(latest.status);
                  const outcome = latest?.passed == null ? submitted && !latest.result_released ? 'Awaiting results' : '—' : latest.passed ? 'Passed' : 'Failed';
                  return <tr key={row.student_id}><td className="px-5 py-3 font-medium">{row.student_name}</td><td className="px-5 py-3">{latest?.assessment_name || '—'}</td><td className="px-5 py-3">{(latest?.status || 'not_started').replaceAll('_', ' ')}</td><td className="px-5 py-3">{latest?.score != null ? `${latest.score.toFixed(1)}%` : '—'}</td><td className="px-5 py-3">{outcome}</td><td className="px-5 py-3"><Button size="sm" variant="outline" onClick={() => router.push(`/mentor/students/${row.student_id}/assessments`)}>View history</Button></td></tr>;
                })}</tbody>
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

      {/* Messaging Modal */}
      {showMessagingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl border-0 flex flex-col h-[600px] max-h-screen">
            <CardHeader className="border-b border-slate-100 flex-shrink-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Message {showMessagingFor.full_name}</CardTitle>
                <CardDescription>Direct communication with your mentee</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMessagingFor(null)}>Close</Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <p className="text-center text-slate-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-slate-500 mt-10">No messages yet. Send a hello!</p>
              ) : (
                messages.map((msg, i) => {
                  // User is mentor, sender_id check requires mentor's ID. But we can deduce it from the fact that we are logged in.
                  // For simplicity, we can align right if we are the sender, but since we don't have our user object here by default,
                  // we can check if msg.sender_id === (somehow know it's us). Wait, mentor is sending, so if sender_id !== showMessagingFor.id it's us.
                  const isMe = msg.sender_id !== showMessagingFor.id;
                  return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'}`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                )})
              )}
            </CardContent>
            <div className="p-4 border-t border-slate-100 flex-shrink-0 flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..." 
                className="flex-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
