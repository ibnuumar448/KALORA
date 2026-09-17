"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Target, Clock, Trophy, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [progressRes, appRes] = await Promise.all([
          api.get('/students/me/progress/overview').catch(() => ({ data: null })),
          api.get('/applications/me').catch(() => ({ data: [] }))
        ]);
        if (progressRes.data) setData(progressRes.data);
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
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
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
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.modules_completed} / {stats.total_modules}</div>
              <p className="text-xs text-slate-500 mt-1">{percentCompleted}% of curriculum</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Average Score</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.average_score}%</div>
              <p className="text-xs text-green-600 mt-1">Based on mastery</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.study_time_hours}h</div>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Rank</CardTitle>
              <Trophy className="h-4 w-4 text-blue-600" />
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
                    <div className="h-12 w-12 rounded bg-blue-100 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{stats.up_next.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{stats.up_next.type}</p>
                    </div>
                  </div>
                  <button className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                    Resume Topic
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">You are all caught up.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
              Following your recent application and successful entry assessment, we are pleased to offer you provisional admission into the Karim Lamido Online Refresher Academy (KALORA) for the <strong>{app.intended_course}</strong> programme, under the <strong>{app.cohort?.name}</strong> cohort.
            </p>

            <p className="mb-4 text-justify leading-relaxed">
              This admission is provisional and subject to your strict compliance with the rules and regulations governing the academy. Your admission number is <strong>{app.admission_number}</strong>. Please ensure you keep this number safe as it will be required for all official correspondence and access to academy resources.
            </p>
            
            <p className="mb-12 text-justify leading-relaxed">
              We congratulate you on this milestone and look forward to an impactful academic journey with you.
            </p>
          </div>

          <div className="flex justify-between items-end mt-20 pt-8 border-t-2 border-slate-200">
            <div>
              <div className="border-b border-black w-48 mb-2"></div>
              <p className="font-bold text-sm">Student's Signature & Date</p>
            </div>
            
            <div className="text-right">
              <p className="font-bold italic text-blue-900 text-xl font-serif mb-2">Saminu Umar</p>
              <div className="border-b border-black w-48 mb-2 inline-block"></div>
              <p className="font-bold text-sm uppercase">Saminu Umar</p>
              <p className="text-sm text-slate-600">Registrar, KALORA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
