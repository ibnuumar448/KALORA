"use client";

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const response = await api.get(`/applications/${id}`);
        setApp(response.data);
      } catch (err) {
        console.error('Failed to fetch application', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id]);

  const handleUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await api.patch(`/applications/${id}/status`, { status });
      const response = await api.get(`/applications/${id}`);
      setApp(response.data);
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const viewFile = async (url: string) => {
    try {
      const response = await api.get(`/applications/documents/${url}`, { responseType: 'blob' });
      const mimeType = (response.headers['content-type'] as string) || 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to view file', err);
      alert('Failed to view document');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading application...</div>;
  if (!app) return <div className="p-8 text-center text-red-500">Application not found.</div>;

  const Item = ({ label, value }: any) => (
    <div>
      <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</dt>
      <dd className="text-sm text-slate-900 font-medium">{value || <span className="text-slate-400 italic">N/A</span>}</dd>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/admissions">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Application Review</h2>
          <p className="text-slate-500 mt-1">{app.application_number || 'Draft'} - {app.user?.full_name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Item label="Full Name" value={app.user?.full_name} />
              <Item label="Email" value={app.user?.email} />
              <Item label="Phone" value={app.phone} />
              <Item label="Gender" value={app.gender} />
              <Item label="Date of Birth" value={app.dob} />
              <Item label="State of Origin" value={app.state_of_origin} />
              <Item label="LGA" value={app.lga} />
              <Item label="Town" value={app.town} />
              <div className="col-span-2"><Item label="Residential Address" value={app.residential_address} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Academic Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Item label="Status" value={app.academic_status === 'secondary_graduate' ? 'Secondary School Graduate' : 'Secondary School Student'} />
              <Item label="School Name" value={app.school_name} />
              {app.academic_status === 'secondary_student' ? (
                <>
                  <Item label="Current Class" value={app.current_class} />
                  <Item label="Expected Graduation Year" value={app.graduation_year} />
                </>
              ) : (
                <Item label="Graduation Year" value={app.graduation_year} />
              )}
            </CardContent>
          </Card>

          {app.academic_status === 'secondary_graduate' && app.olevel_results?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>O'Level Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {app.olevel_results.map((ol: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Item label="Examination" value={`${ol.examination_type} (${ol.examination_year})`} />
                      <Item label="Examination Number" value={ol.examination_number} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Subjects & Grades</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ol.subjects?.map((s: any, i: number) => (
                          <div key={i} className="bg-white px-3 py-2 border rounded text-xs flex justify-between">
                            <span className="font-medium">{s.subject}</span>
                            <span className="text-primary-hover font-bold">{s.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Programme Selection</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Item label="Intended JAMB Year" value={app.intended_jamb_year} />
              <Item label="Intended Course" value={app.intended_course} />
              <Item label="Preferred Institution" value={app.preferred_institution} />
              <div className="col-span-2">
                <Item label="Selected Subjects" value={app.selected_subjects?.join(', ')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parent/Guardian</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Item label="Name" value={app.parent_name} />
              <Item label="Relationship" value={app.parent_relationship} />
              <Item label="Phone" value={app.parent_phone} />
              <Item label="Email" value={app.parent_email} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              {app.documents?.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No documents uploaded.</p>
              ) : (
                <div className="space-y-3">
                  {app.documents?.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{doc.document_type.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-500">{doc.original_filename} ({(doc.file_size / 1024).toFixed(1)} KB)</p>
                      </div>
                      <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={() => viewFile(doc.file_url)}>
                        <Eye className="w-4 h-4" /> View Document
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium capitalize
                    ${app.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                    ${app.status === 'applied' || app.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${app.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                    ${app.status === 'submitted' ? 'bg-emerald-100 text-blue-800' : ''}
                    ${app.status === 'under_review' ? 'bg-purple-100 text-purple-800' : ''}
                    ${app.status === 'waitlisted' ? 'bg-orange-100 text-orange-800' : ''}
                `}>
                  {app.status === 'accepted' && <CheckCircle className="w-4 h-4" />}
                  {app.status === 'rejected' && <XCircle className="w-4 h-4" />}
                  {app.status === 'applied' && <Clock className="w-4 h-4" />}
                  {app.status.replace('_', ' ')}
                </span>
                
                {app.status === 'accepted' && (
                  <p className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                    Admission number has been generated. The student is now enrolled.
                  </p>
                )}
              </div>

              {app.status !== 'accepted' && app.status !== 'rejected' && (
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  {app.status === 'submitted' && (
                    <Button 
                      variant="outline"
                      className="w-full text-purple-600 hover:bg-purple-50 border-purple-200"
                      onClick={() => handleUpdateStatus('under_review')}
                      disabled={updating}
                    >
                      Mark Under Review
                    </Button>
                  )}
                  
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUpdateStatus('accepted')}
                    disabled={updating}
                  >
                    Accept Application
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full text-orange-600 hover:bg-orange-50 border-orange-200"
                    onClick={() => handleUpdateStatus('waitlisted')}
                    disabled={updating}
                  >
                    Waitlist
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updating}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
