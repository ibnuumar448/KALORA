"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle, Clock, FileText, Send, Users, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function AssessmentPerformancePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const fetchPerformance = async () => {
    try {
      const res = await api.get(`/assessments/${id}/performance`);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPerformance();
    }
  }, [id]);

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish results? Students will immediately be able to see their scores.")) return;
    setPublishing(true);
    try {
      await api.post(`/assessments/${id}/publish`);
      toast.success("Results published successfully!");
      fetchPerformance();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <div className="animate-pulse text-slate-500">Loading performance data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6 text-center text-slate-500 pt-20">
        Assessment data could not be loaded.
      </div>
    );
  }

  const isPublished = !!data.release_results_at;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/assessments">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assessments
            </Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{data.assessment_name} - Performance</h2>
          <p className="text-slate-500 mt-1">Review student scores and completion status.</p>
        </div>
        <div>
          {isPublished ? (
            <div className="flex items-center text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-md font-medium text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Results Published on {new Date(data.release_results_at).toLocaleDateString()}
            </div>
          ) : (
            <Button onClick={handlePublish} disabled={publishing}>
              <Send className="w-4 h-4 mr-2" />
              {publishing ? 'Publishing...' : 'Publish Results'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_students}</div>
            <p className="text-xs text-slate-500">Students enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.scored_students}</div>
            <p className="text-xs text-slate-500">Students submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.average_score.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pass_rate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Admission No</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.students.map((student: any) => (
                  <tr key={student.student_assessment_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.student_name}</td>
                    <td className="px-6 py-4 text-slate-500">{student.admission_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.status === 'submitted' || student.status === 'makeup_submitted' ? 'bg-green-100 text-green-700' :
                        student.status === 'missed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {student.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {student.score !== null ? `${student.score.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
                {data.students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-500">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
