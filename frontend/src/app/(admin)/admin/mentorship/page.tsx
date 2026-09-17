"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Users, UserX, UserCheck, ShieldAlert, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { AssignMentorModal } from './components/AssignMentorModal';
import { ReassignMentorModal } from './components/ReassignMentorModal';
import { EndAssignmentModal } from './components/EndAssignmentModal';

export default function MentorshipManagementPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors');
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/mentorship/stats');
        setStats(response.data);
      } catch (err) {
        toast.error('Failed to load mentorship stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mentorship Management</h2>
          <p className="text-slate-500 mt-1">Manage mentor assignments, monitor capacity, and support student development.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_mentors || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
            <UserCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assigned_students || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Students</CardTitle>
            <UserX className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unassigned_students || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students at Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.at_risk_students || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-md mb-6">
          <button 
            className={`py-1.5 text-sm font-medium rounded-sm ${activeTab === 'mentors' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveTab('mentors')}
          >
            Mentors
          </button>
          <button 
            className={`py-1.5 text-sm font-medium rounded-sm ${activeTab === 'unassigned' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveTab('unassigned')}
          >
            Unassigned Students
          </button>
          <button 
            className={`py-1.5 text-sm font-medium rounded-sm ${activeTab === 'history' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveTab('history')}
          >
            Assignment History
          </button>
        </div>
        
        {activeTab === 'mentors' && <MentorsTab router={router} />}
        {activeTab === 'unassigned' && <UnassignedStudentsTab />}
        {activeTab === 'history' && <AssignmentHistoryTab />}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Mentors Tab
// ----------------------------------------------------------------------
function MentorsTab({ router }: { router: any }) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await api.get('/mentorship/mentors');
        setMentors(response.data);
      } catch (err) {
        toast.error('Failed to load mentors');
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading mentors...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Mentors</CardTitle>
        <CardDescription>View all mentors and their current capacity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3">Mentor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map((m) => {
                const percent = Math.min(100, Math.round((m.assigned_count / m.capacity) * 100));
                const isFull = percent >= 100;
                
                return (
                  <tr key={m.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{m.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{m.assigned_count} / {m.capacity}</span>
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isFull ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/mentorship/mentors/${m.id}`)}>
                        View Details <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {mentors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No mentors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Student Assignments Tab
// ----------------------------------------------------------------------
function StudentAssignmentsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [reassignOpen, setReassignOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<any>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mentorship/students/assigned');
      setStudents(response.data);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Assignments</CardTitle>
        <CardDescription>View all admitted students and their active mentorship status.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-sm text-slate-500">Loading assignments...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission No</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Assigned Mentor</th>
                  <th className="px-4 py-3">Assigned Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.cohort_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.mentor_name}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(s.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setActiveAction(s); setReassignOpen(true); }}>
                          Change
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { setActiveAction(s); setEndOpen(true); }}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No assigned students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ReassignMentorModal 
        open={reassignOpen} 
        onOpenChange={setReassignOpen} 
        assignmentId={activeAction?.assignment_id}
        studentName={activeAction?.full_name}
        currentMentorName={activeAction?.mentor_name}
        onSuccess={fetchStudents}
      />

      <EndAssignmentModal 
        open={endOpen} 
        onOpenChange={setEndOpen} 
        assignmentId={activeAction?.assignment_id}
        studentName={activeAction?.full_name}
        currentMentorName={activeAction?.mentor_name}
        onSuccess={fetchStudents}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// Unassigned Students Tab
// ----------------------------------------------------------------------
function UnassignedStudentsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mentorship/students/unassigned');
      setStudents(response.data);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load unassigned students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Unassigned Students</CardTitle>
          <CardDescription>Eligible students currently without a mentor.</CardDescription>
        </div>
        <Button 
          disabled={selectedIds.length === 0}
          onClick={() => setAssignOpen(true)}
        >
          Assign Selected Students ({selectedIds.length})
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-sm text-slate-500">Loading students...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission No</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => toggleSelect(s.id)}>
                    <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.cohort_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Unassigned</span>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">All students are currently assigned to mentors!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <AssignMentorModal 
        open={assignOpen} 
        onOpenChange={setAssignOpen} 
        selectedStudentIds={selectedIds}
        onSuccess={fetchStudents}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// Assignment History Tab
// ----------------------------------------------------------------------
function AssignmentHistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<any>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mentorship/history');
      setHistory(response.data);
    } catch (err) {
      toast.error('Failed to load assignment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment History</CardTitle>
        <CardDescription>A complete audit trail of all mentorship assignments and changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-sm text-slate-500">Loading history...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Mentor</th>
                  <th className="px-4 py-3">Assigned Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Assigned By</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{h.student_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{h.mentor_name}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(h.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500">{h.ended_at ? new Date(h.ended_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      {h.status === 'active' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Ended</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{h.end_reason || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{h.assigned_by_name || 'System'}</td>
                    <td className="px-4 py-3">
                      {h.status === 'active' && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setActiveAction(h); setReassignOpen(true); }}>
                            Change
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setActiveAction(h); setEndOpen(true); }}>
                            Remove
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No assignment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ReassignMentorModal 
        open={reassignOpen} 
        onOpenChange={setReassignOpen} 
        assignmentId={activeAction?.id}
        studentName={activeAction?.student_name}
        currentMentorName={activeAction?.mentor_name}
        onSuccess={fetchHistory}
      />

      <EndAssignmentModal 
        open={endOpen} 
        onOpenChange={setEndOpen} 
        assignmentId={activeAction?.id}
        studentName={activeAction?.student_name}
        currentMentorName={activeAction?.mentor_name}
        onSuccess={fetchHistory}
      />
    </Card>
  );
}

// force recompile
