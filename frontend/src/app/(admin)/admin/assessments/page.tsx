"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { BookOpen, Plus, Clock, Users, Database, AlertCircle, Check, X, Upload, Trash2, Send, CheckCircle, Target, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewMakeupModal } from './components/ReviewMakeupModal';
import { AssessmentCreateModal } from './components/AssessmentCreateModal';
import { AddQuestionModal } from './components/AddQuestionModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import Link from 'next/link';

export default function AssessmentsManagementPage() {
  const [activeTab, setActiveTab] = useState<'assessments' | 'question-bank' | 'makeup-requests' | 'results'>('assessments');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Assessment Module</h2>
          <p className="text-slate-500 mt-1">Manage examinations, questions, and student makeups.</p>
        </div>
        {activeTab === 'assessments' && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
        )}
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-max">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'assessments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setActiveTab('assessments')}
        >
          <BookOpen className="w-4 h-4 inline-block mr-2" />
          Assessments
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'question-bank' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setActiveTab('question-bank')}
        >
          <Database className="w-4 h-4 inline-block mr-2" />
          Question Bank
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'makeup-requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setActiveTab('makeup-requests')}
        >
          <AlertCircle className="w-4 h-4 inline-block mr-2" />
          Makeup Requests
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'results' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setActiveTab('results')}
        >
          <Check className="w-4 h-4 inline-block mr-2" />
          Results
        </button>
      </div>

      {activeTab === 'assessments' && <AssessmentsTab />}
      {activeTab === 'question-bank' && <QuestionBankTab />}
      {activeTab === 'makeup-requests' && <MakeupRequestsTab />}
      {activeTab === 'results' && <ResultsTab />}

      <AssessmentCreateModal 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        onSuccess={() => {
          // just force a re-render or let the tab fetch
          setCreateOpen(false);
          window.location.reload(); // Simple MVP refresh
        }} 
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// Assessments Tab
// ----------------------------------------------------------------------
function AssessmentsTab() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = () => {
    setLoading(true);
    api.get('/assessments')
      .then(res => setAssessments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment? This will also remove it for all students.")) return;
    try {
      await api.delete(`/assessments/${id}`);
      toast.success("Assessment deleted successfully");
      fetchAssessments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete assessment");
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quiz: 'bg-blue-100 text-blue-700',
      mock: 'bg-purple-100 text-purple-700',
      final: 'bg-red-100 text-red-700',
      entry: 'bg-green-100 text-green-700',
      diagnostic: 'bg-yellow-100 text-yellow-700',
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Assessments</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse text-slate-500">Loading...</div>
        ) : assessments.length === 0 ? (
          <div className="text-center p-12 text-slate-500">No assessments created yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Type</th>
                  <th className="px-6 py-4 text-left font-semibold">Questions</th>
                  <th className="px-6 py-4 text-left font-semibold">Duration</th>
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assessments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{a.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(a.type)}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{a.question_count}</td>
                    <td className="px-6 py-4 text-slate-500">{a.duration_minutes || 'Untimed'}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Question Bank Tab
// ----------------------------------------------------------------------
function QuestionBankTab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const fetchQuestions = () => {
    api.get('/question-bank').then(res => {
      setQuestions(res.data);
      setSelectedIds(new Set());
    }).catch(console.error);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected questions?`)) return;
    try {
      await api.post('/question-bank/bulk-delete', { question_ids: Array.from(selectedIds) });
      toast.success("Questions deleted successfully");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete questions");
    }
  };

  const handleClearBank = async () => {
    if (!confirm("WARNING: Are you sure you want to delete ALL questions in the question bank? This cannot be undone.")) return;
    try {
      await api.post('/question-bank/bulk-delete', { delete_all: true });
      toast.success("Question bank cleared completely");
      fetchQuestions();
    } catch (err: any) {
      toast.error("Failed to clear bank");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Question Bank</CardTitle>
          <CardDescription>Manage curriculum questions.</CardDescription>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.size})
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleClearBank}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Bank
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setBulkModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload (Excel)
          </Button>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(questions.map(q => q.id)));
                      else setSelectedIds(new Set());
                    }}
                    checked={questions.length > 0 && selectedIds.size === questions.length}
                  />
                </th>
                <th className="px-6 py-4 text-left font-semibold">Subject</th>
                <th className="px-6 py-4 text-left font-semibold">Question Text</th>
                <th className="px-6 py-4 text-left font-semibold">Difficulty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {questions.map(q => (
                <tr key={q.id} className={selectedIds.has(q.id) ? "bg-blue-50" : ""}>
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-medium">{q.subject_name}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-md truncate" title={q.text}>{q.text}</td>
                  <td className="px-6 py-4 text-slate-500 capitalize">{q.difficulty || 'N/A'}</td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-slate-500">No questions in the bank yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <AddQuestionModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen} 
        onSuccess={fetchQuestions} 
      />
      <BulkUploadModal 
        open={bulkModalOpen} 
        onOpenChange={setBulkModalOpen} 
        onSuccess={fetchQuestions} 
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// Makeup Requests Tab
// ----------------------------------------------------------------------
function MakeupRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);

  const fetchRequests = () => {
    api.get('/assessments/makeup-requests')
      .then(res => setRequests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Makeup Assessment Requests</CardTitle>
        <CardDescription>Review and approve makeup requests from students who missed their assessments.</CardDescription>
      </CardHeader>
      <CardContent>
         {loading ? (
           <div className="animate-pulse text-slate-500">Loading requests...</div>
         ) : requests.length === 0 ? (
           <div className="text-center p-12 text-slate-500">No makeup requests currently pending.</div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-sm">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                 <tr>
                   <th className="px-6 py-4 text-left font-semibold">Student</th>
                   <th className="px-6 py-4 text-left font-semibold">Assessment</th>
                   <th className="px-6 py-4 text-left font-semibold">Reason</th>
                   <th className="px-6 py-4 text-left font-semibold">Status</th>
                   <th className="px-6 py-4 text-left font-semibold">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {requests.map(r => (
                   <tr key={r.id}>
                     <td className="px-6 py-4">
                       <div className="font-medium text-slate-900">{r.student_name}</div>
                       <div className="text-xs text-slate-500">{r.student_admission_no}</div>
                     </td>
                     <td className="px-6 py-4 text-slate-900">{r.assessment_name}</td>
                     <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                     <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                         r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                         r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                       }`}>
                         {r.status.toUpperCase()}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       {r.status === 'pending' && (
                         <Button size="sm" variant="outline" className="text-blue-600" onClick={() => setActiveRequest(r)}>Review</Button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}

         <ReviewMakeupModal 
           open={!!activeRequest}
           onOpenChange={(open) => { if (!open) setActiveRequest(null); }}
           request={activeRequest}
           onSuccess={() => fetchRequests()}
         />
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Results Tab
// ----------------------------------------------------------------------
function ResultsTab() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api.get('/assessments').then(res => {
      setAssessments(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedId) {
      setLoading(true);
      api.get(`/assessments/${selectedId}/performance`)
        .then(res => setData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [selectedId]);

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish results? Students will immediately be able to see their scores.")) return;
    setPublishing(true);
    try {
      await api.post(`/assessments/${selectedId}/publish`);
      toast.success("Results published successfully!");
      const res = await api.get(`/assessments/${selectedId}/performance`);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  const isPublished = data && !!data.release_results_at;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Assessment Results & Performance</CardTitle>
            <CardDescription>Select an assessment to view student grades.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <select
              className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              {assessments.length === 0 && <option value="">No assessments available</option>}
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {data && (
              isPublished ? (
                <div className="flex items-center text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md font-medium text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Published
                </div>
              ) : (
                <Button onClick={handlePublish} disabled={publishing} size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading performance data...</div>
        ) : (
          <>
            {data && (
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2"><Users className="w-4 h-4" /> Total Assigned</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_students}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2"><FileText className="w-4 h-4" /> Completed</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{data.scored_students}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Average Score</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{data.average_score.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2"><Target className="w-4 h-4" /> Pass Rate</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{data.pass_rate.toFixed(1)}%</p>
                </div>
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Student Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Admission No</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(!data || data.students.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        {data ? "No students have been assigned this assessment." : "Select an assessment to view results."}
                      </td>
                    </tr>
                  ) : (
                    data.students.map((student: any) => (
                      <tr key={student.student_assessment_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">{student.student_name}</td>
                        <td className="px-6 py-3 text-slate-500">{student.admission_number}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'submitted' || student.status === 'makeup_submitted' ? 'bg-green-100 text-green-700' :
                            student.status === 'missed' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {student.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold">
                          {student.score !== null ? `${student.score.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
