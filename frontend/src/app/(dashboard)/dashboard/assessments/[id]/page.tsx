"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AssessmentAttemptPage({ params }: { params: { id: string } }) {
  const unwrappedParams = React.use(params as any) as { id: string };
  const id = unwrappedParams.id;
  const [attempt, setAttempt] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const startAttempt = async () => {
      try {
        // Start a new attempt
        const attemptRes = await api.post(`/assessments/${id}/attempts`);
        setAttempt(attemptRes.data);
        
        // Fetch assessment details
        const allAssessments = await api.get('/assessments');
        const currentAssessment = allAssessments.data.find((a: any) => a.id === id);
        setAssessment(currentAssessment);
        
        // Fetch questions for this assessment
        const questionsRes = await api.get(`/assessments/${id}/questions`);
        setQuestions(questionsRes.data);
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    };
    
    startAttempt();
  }, [id]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!attempt) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      // Convert answers to API format
      const submission = {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: questionId,
          selected_answer: answer
        }))
      };
      
      const result = await api.post(`/attempts/${attempt.id}/submit`, submission);
      setCompleted(true);
      setAttempt(result.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-slate-500 animate-pulse">Loading assessment...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard/assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessments
          </Button>
        </Link>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-900">Assessment Submitted!</h2>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-900">
                  Your Score: <span className="text-green-600">{(attempt.score || 0).toFixed(1)}%</span>
                </p>
                <p className={`text-slate-600 ${(attempt.score || 0) >= (assessment?.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>
                  {(attempt.score || 0) >= (assessment?.passing_score || 50) 
                    ? `✓ Passed (Required: ${assessment?.passing_score}%)` 
                    : `Did not meet passing score (Required: ${assessment?.passing_score}%)`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/assessments">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessments
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{assessment?.name}</CardTitle>
              <CardDescription className="mt-2">
                {assessment?.question_count || 0} questions {assessment?.duration_minutes && `• ${assessment.duration_minutes} minutes`}
              </CardDescription>
            </div>
            {assessment?.duration_minutes && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                {assessment.duration_minutes}m
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-8">
          {questions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No questions available for this assessment</p>
          ) : (
            questions.map((question, idx) => (
              <div key={question.id} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
                <h3 className="font-medium text-slate-900">
                  <span className="text-slate-500">Q{idx + 1}:</span> {question.text}
                </h3>
                <div className="space-y-2">
                  {question.options.map((option: any, optIdx: number) => {
                    const optionValue = typeof option === 'object' ? option.id : option;
                    const optionLabel = typeof option === 'object' ? option.text : option;
                    
                    return (
                      <label key={optIdx} className="flex items-center gap-3 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={optionValue}
                          checked={answers[question.id] === optionValue}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">{optionLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/assessments">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button 
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length === 0 || questions.length === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Assessment'}
        </Button>
      </div>
    </div>
  );
}
