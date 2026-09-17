import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function InterventionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Intervention Log</h2>
          <p className="text-slate-500 mt-1">Review the history of support given to your students.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notes</CardTitle>
          <CardDescription>Your logged interventions for this cohort.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12 text-slate-500 border border-dashed border-slate-300 rounded-lg bg-slate-50">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-semibold text-slate-900">No interventions logged yet</h3>
              <p className="mt-1 text-sm text-slate-500">Go to your students list to add a note.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
