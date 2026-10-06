"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle2, XCircle, Trophy, Users, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function DisciplineManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [disciplineStatus, setDisciplineStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/admin/users');
        const nonSuperAdmins = response.data.filter((u: any) => !u.roles.includes('super_admin'));
        setStudents(nonSuperAdmins);
      } catch (err: any) {
        console.error('Failed to fetch students', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    try {
      const response = await api.get(`/students/${student.id}/discipline`);
      setDisciplineStatus(response.data);
    } catch (err: any) {
      console.error('Failed to fetch discipline status', err);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'green':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'green':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'yellow':
        return <AlertTriangle className="w-5 h-5" />;
      case 'red':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Discipline Management</h2>
        <div className="animate-pulse text-slate-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Discipline Management</h2>
        <p className="text-slate-500 mt-1">Monitor student conduct and manage disciplinary actions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Student List */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'border-primary bg-primary-light'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">{student.full_name}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Discipline Status */}
        <div className="md:col-span-2">
          {selectedStudent && disciplineStatus ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedStudent.full_name}
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(disciplineStatus.current_risk_level)}`}>
                    {getRiskLevelIcon(disciplineStatus.current_risk_level)}
                    {disciplineStatus.current_risk_level?.toUpperCase()}
                  </span>
                </CardTitle>
                <CardDescription>{selectedStudent.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Total Defaults</p>
                    <p className="text-2xl font-bold text-slate-900">{disciplineStatus.total_defaults}</p>
                    <p className="text-xs text-green-600 mt-1">{disciplineStatus.excused_defaults} excused</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Warnings</p>
                    <p className="text-2xl font-bold text-slate-900">{disciplineStatus.warning_count}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Active Suspensions</p>
                    <p className="text-2xl font-bold text-slate-900">{disciplineStatus.active_suspensions}</p>
                  </div>
                </div>

                {/* Recent Defaults */}
                {disciplineStatus.recent_defaults && disciplineStatus.recent_defaults.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm">Recent Defaults</h4>
                    <div className="space-y-2">
                      {disciplineStatus.recent_defaults.map((d: any) => (
                        <div key={d.id} className="p-2 bg-slate-50 rounded text-sm">
                          <p className="text-slate-900">{d.reason}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {d.is_excused && <span className="text-green-600">✓ Excused: {d.excused_reason}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Warnings */}
                {disciplineStatus.recent_warnings && disciplineStatus.recent_warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm">Warnings</h4>
                    <div className="space-y-2">
                      {disciplineStatus.recent_warnings.map((w: any) => (
                        <div key={w.id} className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-sm">
                          <p className="font-medium text-yellow-900 capitalize">{w.level} Warning</p>
                          <p className="text-slate-700">{w.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Suspension */}
                {disciplineStatus.active_suspension && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
                    <p className="font-semibold text-red-900 mb-1">⚠️ Active Suspension</p>
                    <p className="text-red-800 mb-2">{disciplineStatus.active_suspension.reason}</p>
                    <p className="text-xs text-red-700">
                      Started: {new Date(disciplineStatus.active_suspension.started_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => toast.info('Log Default: Not yet implemented')}>Log Default</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info('Issue Warning: Not yet implemented')}>Issue Warning</Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to suspend this student?")) return;
                      try {
                        await api.post(`/students/${selectedStudent.id}/discipline/suspensions`, { reason: "Admin mandated suspension" });
                        toast.success("Student suspended");
                        handleSelectStudent(selectedStudent);
                      } catch (err) {
                        toast.error("Failed to suspend student");
                      }
                    }}
                  >
                    Suspend Student
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
                      try {
                        await api.delete(`/admin/users/${selectedStudent.id}`);
                        toast.success("User deleted");
                        setSelectedStudent(null);
                        setDisciplineStatus(null);
                        const res = await api.get('/admin/users?role=student');
                        setStudents(res.data);
                      } catch (err) {
                        toast.error("Failed to delete user");
                      }
                    }}
                  >
                    Delete User
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Select a student to view discipline details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discipline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">At-Risk Students (Yellow)</p>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">Critical Risk (Red)</p>
              <p className="text-3xl font-bold text-red-600">0</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">Good Standing (Green)</p>
              <p className="text-3xl font-bold text-green-600">{students.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-slate-900">{students.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
