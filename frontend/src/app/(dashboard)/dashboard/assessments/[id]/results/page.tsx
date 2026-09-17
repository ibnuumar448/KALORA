"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Target, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get('/assessments/my-assignments')
        .then(res => {
          const match = res.data.find((a: any) => a.id === id);
          setAssignment(match);
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load results");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto animate-pulse">Loading results...</div>;
  }

  if (!assignment) {
    return <div className="p-6 max-w-4xl mx-auto">Assessment not found.</div>;
  }

  const isPublished = assignment.release_results_at && new Date(assignment.release_results_at) <= new Date();

  if (!isPublished) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link href="/dashboard/assessments">
          <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessments
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Awaiting Results</h2>
            <p className="text-slate-600">You have successfully submitted this assessment. The results will be available here once published by your administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = assignment.score || 0;
  const passed = score >= assignment.passing_score;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link href="/dashboard/assessments">
        <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-slate-500">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessments
        </Button>
      </Link>

      <div className="flex flex-col items-center justify-center text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assessment Results</h1>
        <p className="text-slate-500 text-lg">{assignment.name}</p>
      </div>

      <Card className={`border-t-4 ${passed ? 'border-t-green-500' : 'border-t-red-500'}`}>
        <CardContent className="pt-8 pb-10 flex flex-col items-center justify-center space-y-6">
          <div className={`p-4 rounded-full ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {passed ? (
              <Trophy className={`w-16 h-16 text-green-600`} />
            ) : (
              <XCircle className={`w-16 h-16 text-red-600`} />
            )}
          </div>
          
          <div className="text-center space-y-2">
            <h2 className={`text-5xl font-extrabold tracking-tight ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {score.toFixed(1)}%
            </h2>
            <p className="text-slate-500 font-medium">Your Final Score</p>
          </div>

          <div className="w-full max-w-md bg-slate-50 border rounded-lg p-4 mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Target className="w-4 h-4" /> Passing Score
              </span>
              <p className="font-semibold">{assignment.passing_score}%</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Status
              </span>
              <p className={`font-semibold ${passed ? 'text-green-700' : 'text-red-700'}`}>
                {passed ? 'Passed' : 'Failed'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1">
                <FileText className="w-4 h-4" /> Questions
              </span>
              <p className="font-semibold">{assignment.question_count}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Type
              </span>
              <p className="font-semibold capitalize">{assignment.type}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
