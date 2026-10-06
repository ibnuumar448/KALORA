"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, GraduationCap, AlertTriangle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await api.get('/admin/overview');
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch admin overview', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load overview data.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h2>
          <p className="text-slate-500 mt-1">Super Admin capabilities for managing KALORA.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.total_students}</div>
            <p className="text-xs text-slate-500 mt-1">Accepted in Pilot</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Mentors</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.active_mentors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Apps</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.pending_applications}</div>
            <p className="text-xs text-slate-500 mt-1">Requires review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.stats.at_risk_students}</div>
            <p className="text-xs text-slate-500 mt-1">Pending admin review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Review and approve new students into cohorts.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_applications.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-md text-center border border-dashed border-slate-200">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {data.recent_applications.map((app: any) => (
                  <div key={app.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-slate-900">{app.student_name}</span>
                    <Link href={`/admin/admissions/${app.id}`}>
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data.disciplinary_actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Disciplinary Actions</CardTitle>
              <CardDescription>Suspensions requiring Admin Confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.disciplinary_actions.map((action: any) => (
                  <div key={action.id} className="rounded-lg border border-red-100 bg-red-50 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">Suspension Review</h4>
                        <p className="text-xs text-slate-600 mt-1">{action.description}</p>
                      </div>
                      <AlertTriangle className="text-red-500 h-5 w-5" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="bg-white">Dismiss</Button>
                      <Button className="bg-red-600 hover:bg-red-700 text-white">Confirm Suspension</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
