"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Target, Clock, Trophy, Printer, MessageSquare, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [mentorData, setMentorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mentorship states
  const [showMessaging, setShowMessaging] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [supportCategory, setSupportCategory] = useState('Academic difficulty');
  const [supportText, setSupportText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const fetchMessages = async () => {
    if (!mentorData?.current_mentor?.assignment_id) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/mentorship/assignments/${mentorData.current_mentor.assignment_id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenMessaging = async () => {
    setShowMessaging(true);
    fetchMessages();
    try {
      await api.post('/notifications/read-type?type=mentorship_message');
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {}
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !mentorData?.current_mentor?.assignment_id) return;
    try {
      await api.post(`/mentorship/assignments/${mentorData.current_mentor.assignment_id}/messages`, {
        content: newMessage
      });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      alert("Failed to send message");
    }
  };

  const handleRequestSupport = async () => {
    if (!supportText.trim()) return;
    setSubmittingSupport(true);
    try {
      await api.post('/students/me/support-requests', {
        category: supportCategory,
        message: supportText
      });
      setSupportText('');
      setShowSupport(false);
      alert('Support request submitted successfully');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmittingSupport(false);
    }
  };

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [progressRes, appRes, mentorRes] = await Promise.all([
          api.get('/students/me/progress/overview').catch(() => ({ data: null })),
          api.get('/applications/me').catch(() => ({ data: [] })),
          api.get('/students/me/mentor').catch(() => ({ data: null }))
        ]);
        if (progressRes.data) setData(progressRes.data);
        if (mentorRes.data) setMentorData(mentorRes.data);
        if (appRes.data && appRes.data.length > 0) {
          const fetchedApp = appRes.data[0];
          if (fetchedApp.status !== 'accepted') {
            window.location.href = '/application-status';
            return;
          }
          setApp(fetchedApp);
        } else {
          window.location.href = '/apply';
          return;
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Fallback defaults if progress data is missing but user is admitted
  const stats = data || {
    total_modules: 0, modules_completed: 0, average_score: 0, study_time_hours: 0, rank: 'N/A', recent_assessments: []
  };

  const percentCompleted = stats.total_modules > 0 ? Math.round((stats.modules_completed / stats.total_modules) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0">

      {/* Screen View */}
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!</h2>
            <p className="text-slate-500 mt-1">Here is an overview of your academic progress.</p>
          </div>
          {app && app.status === 'accepted' && (
            <Button onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print Admission Letter
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Modules Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.modules_completed} / {stats.total_modules}</div>
              <p className="text-xs text-slate-500 mt-1">{percentCompleted}% of curriculum</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Average Score</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.average_score}%</div>
              <p className="text-xs text-green-600 mt-1">Based on mastery</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.study_time_hours}h</div>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Rank</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.rank}</div>
              <p className="text-xs text-slate-500 mt-1">In your cohort</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Your latest quiz and mock exam results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!stats.recent_assessments || stats.recent_assessments.length === 0) ? (
                  <p className="text-sm text-slate-500">No recent assessments found.</p>
                ) : (
                  stats.recent_assessments.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.date}</p>
                      </div>
                      <div className="font-semibold text-slate-900">{item.score}%</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Up Next</CardTitle>
              <CardDescription>Continue where you left off.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.up_next ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-emerald-100 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{stats.up_next.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{stats.up_next.type}</p>
                    </div>
                  </div>
                  <button className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
                    Resume Topic
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">You are all caught up.</p>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>My Mentor</CardTitle>
              <CardDescription>Your assigned guide for the KALORA program.</CardDescription>
            </CardHeader>
            <CardContent>
              {mentorData?.current_mentor ? (
                <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{mentorData.current_mentor.mentor_name}</h4>
                      <p className="text-sm text-slate-500 font-medium">Active Mentor</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="w-full sm:w-auto text-slate-700" onClick={() => setShowSupport(true)}>
                      Request Support
                    </Button>
                    <Button className="w-full sm:w-auto gap-2" onClick={handleOpenMessaging}>
                      <MessageSquare className="w-4 h-4" /> Message Mentor
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <UserIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Your mentor has not been assigned yet.</p>
                  <p className="text-sm text-slate-500 mt-1">We will notify you once a mentor is assigned to you.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showMessaging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl border-0 flex flex-col h-[600px] max-h-screen">
            <CardHeader className="border-b border-slate-100 flex-shrink-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Message {mentorData?.current_mentor?.mentor_name}</CardTitle>
                <CardDescription>Direct communication with your active mentor</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMessaging(false)}>Close</Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <p className="text-center text-slate-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-slate-500 mt-10">No messages yet. Say hello!</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.sender_id === user?.id ? 'bg-primary text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'}`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))
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

      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl border-0">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Request Support</CardTitle>
              <CardDescription>Send a structured help request to your mentor</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Category</label>
                <select 
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Academic difficulty</option>
                  <option>Subject difficulty</option>
                  <option>Study planning</option>
                  <option>General guidance</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Details</label>
                <textarea 
                  value={supportText}
                  onChange={(e) => setSupportText(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Explain what you need help with..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowSupport(false)} disabled={submittingSupport}>Cancel</Button>
                <Button onClick={handleRequestSupport} disabled={submittingSupport}>
                  {submittingSupport ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print View: Admission Letter */}
      {app && app.status === 'accepted' && (
        <div className="hidden print:block bg-white text-black p-8">
          <div className="flex flex-col items-center border-b-4 border-slate-900 pb-6 mb-8">
            <img src="/logo.jpg" alt="KALORA Logo" className="h-24 object-contain mb-4" />
            <h1 className="text-4xl font-bold uppercase tracking-widest text-slate-900">KALORA</h1>
            <h2 className="text-lg font-semibold uppercase text-slate-600 mt-1">Karim Lamido Online Refresher Academy</h2>
          </div>

          <div className="flex justify-between items-start mb-12">
            <div className="text-sm">
              <p className="font-bold mb-1">To:</p>
              <p className="font-semibold text-lg uppercase">{app.user?.full_name}</p>
              <p>{app.phone}</p>
              <p>{app.residential_address}</p>
            </div>
            <div className="text-sm text-right">
              <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
              <p><span className="font-bold">Admission No:</span> {app.admission_number}</p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center underline uppercase mb-8">Offer of Provisional Admission</h3>

            <p className="mb-4 text-justify leading-relaxed">
              Dear <strong>{app.user?.full_name}</strong>,
            </p>

            <p className="mb-4 text-justify leading-relaxed">
              Following your recent application and successful entry assessment, we are pleased to offer you provisional admission into the Karim Lamido Online Refresher Academy (KALORA) for the <strong>Science UTME Preparation</strong> programme, under the <strong>{app.cohort?.name}</strong> cohort.
            </p>

            <p className="mb-4 text-justify leading-relaxed">
              This admission is provisional and subject to your strict compliance with the rules and regulations governing the academy. Your admission number is <strong>{app.admission_number}</strong>. Please ensure you keep this number safe as it will be required for all official correspondence and access to academy resources.
            </p>

            <p className="mb-12 text-justify leading-relaxed">
              We congratulate you on this milestone and look forward to an impactful academic journey with you.
            </p>
          </div>

          <div className="flex justify-end mt-20 pt-8 border-t-2 border-slate-200">
            <div className="text-right">
              <p className="font-bold italic text-emerald-900 text-xl font-serif mb-2">Saminu Umar</p>
              <p className="text-sm text-slate-600">Registrar, KALORA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
