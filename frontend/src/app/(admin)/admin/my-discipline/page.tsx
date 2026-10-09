"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function MyDisciplinePage() {
  const [disciplineStatus, setDisciplineStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchDiscipline = async () => {
    try {
      // First get current user
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);

      // Then get their discipline
      const response = await api.get(`/students/${userRes.data.id}/discipline`);
      setDisciplineStatus(response.data);
    } catch (err: any) {
      console.error('Failed to fetch discipline status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscipline();
  }, []);

  const handleAcknowledge = async (type: string, id: string) => {
    try {
      await api.put(`/discipline/notices/${type}/${id}/acknowledge`);
      toast.success("Notice acknowledged successfully");
      fetchDiscipline(); // Refresh the list
    } catch (err: any) {
      toast.error("Failed to acknowledge notice");
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

  const getStatusText = (level: string) => {
    switch (level) {
      case 'green':
        return 'Good Standing';
      case 'yellow':
        return 'Warning Active';
      case 'red':
        return 'Suspended / Critical';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Disciplinary Notices</h2>
        <div className="animate-pulse text-slate-500">Loading your records...</div>
      </div>
    );
  }

  if (!disciplineStatus) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Disciplinary Notices</h2>
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-slate-600 font-medium">You have no disciplinary records.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Disciplinary Notices</h2>
        <p className="text-slate-500 mt-1">Review and acknowledge your formal disciplinary notices.</p>
      </div>

      <Card className={`border-t-4 ${
        disciplineStatus.current_risk_level === 'red' ? 'border-red-500' :
        disciplineStatus.current_risk_level === 'yellow' ? 'border-yellow-500' : 'border-green-500'
      }`}>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>Your overall disciplinary standing on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${getRiskLevelColor(disciplineStatus.current_risk_level)}`}>
              {getStatusText(disciplineStatus.current_risk_level)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 border-b pb-2">Active Notices & History</h3>

        {/* Suspensions */}
        {disciplineStatus.active_suspension && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-red-900 font-bold mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  Account Suspension
                </div>
                <p className="text-red-800 text-sm mb-2">{disciplineStatus.active_suspension.reason}</p>
                <p className="text-xs text-red-700">Issued by: Super Admin • {new Date(disciplineStatus.active_suspension.started_at).toLocaleDateString()}</p>
              </div>
              {!disciplineStatus.active_suspension.acknowledged_at ? (
                <Button variant="outline" className="bg-white hover:bg-red-50 border-red-300 text-red-700 whitespace-nowrap" onClick={() => handleAcknowledge('suspension', disciplineStatus.active_suspension.id)}>
                  Acknowledge Notice
                </Button>
              ) : (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">
                  Acknowledged {new Date(disciplineStatus.active_suspension.acknowledged_at).toLocaleDateString()}
                </span>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warnings */}
        {disciplineStatus.recent_warnings?.map((w: any) => (
          <Card key={w.id} className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-yellow-900 font-bold mb-1 capitalize">
                  <Info className="w-5 h-5" />
                  {w.level} Warning
                </div>
                <p className="text-slate-800 text-sm mb-2">{w.reason}</p>
                <p className="text-xs text-slate-600">Issued by: Super Admin • {new Date(w.created_at).toLocaleDateString()}</p>
              </div>
              {!w.acknowledged_at ? (
                <Button variant="outline" className="bg-white hover:bg-yellow-50 border-yellow-300 text-yellow-800 whitespace-nowrap" onClick={() => handleAcknowledge('warning', w.id)}>
                  Acknowledge Notice
                </Button>
              ) : (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">
                  Acknowledged {new Date(w.acknowledged_at).toLocaleDateString()}
                </span>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Incidents / Defaults */}
        {disciplineStatus.recent_defaults?.map((d: any) => (
          <Card key={d.id} className="border-slate-200">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
                  Disciplinary Incident
                </div>
                <p className="text-slate-700 text-sm mb-2">{d.reason}</p>
                {d.is_excused && <p className="text-xs text-green-600 mb-2">Excused: {d.excused_reason}</p>}
                <p className="text-xs text-slate-500">Issued by: Super Admin • {new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              {!d.acknowledged_at ? (
                <Button variant="outline" className="whitespace-nowrap" onClick={() => handleAcknowledge('incident', d.id)}>
                  Acknowledge Notice
                </Button>
              ) : (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">
                  Acknowledged {new Date(d.acknowledged_at).toLocaleDateString()}
                </span>
              )}
            </CardContent>
          </Card>
        ))}

        {(!disciplineStatus.recent_warnings?.length && !disciplineStatus.recent_defaults?.length && !disciplineStatus.active_suspension) && (
          <div className="p-8 text-center border rounded-lg bg-slate-50">
            <p className="text-slate-600">You have no formal notices requiring review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
