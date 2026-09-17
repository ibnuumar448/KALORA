"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await api.get('/applications');
        setApplications(response.data);
      } catch (err) {
        console.error('Failed to fetch applications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading applications...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admissions Pipeline</h2>
          <p className="text-slate-500 mt-1">Review applications and generate admission numbers.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>Students who have applied to KALORA cohorts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {applications.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-slate-500 border-t border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No applications</h3>
                <p className="mt-1 text-sm text-slate-500">No student applications have been received.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student</th>
                    <th className="px-6 py-4 font-medium">App Number</th>
                    <th className="px-6 py-4 font-medium">Admission #</th>
                    <th className="px-6 py-4 font-medium">Academic Status</th>
                    <th className="px-6 py-4 font-medium">Applied Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{app.user?.full_name || 'Unknown'}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {app.application_number || <span className="text-slate-300 italic">Draft</span>}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {app.admission_number || <span className="text-slate-300 italic">Pending</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 capitalize">{app.academic_status?.replace('_', ' ') || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${app.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                          ${app.status === 'submitted' ? 'bg-blue-100 text-blue-800' : ''}
                          ${app.status === 'under_review' ? 'bg-purple-100 text-purple-800' : ''}
                          ${app.status === 'applied' || app.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${app.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/admissions/${app.id}`}>
                          <Button variant="outline" size="sm">Review</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
