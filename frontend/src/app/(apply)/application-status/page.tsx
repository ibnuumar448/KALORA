"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ApplicationStatusPage() {
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await api.get('/applications/me');
        if (res.data && res.data.length > 0) {
          const fetchedApp = res.data[0];
          setApp(fetchedApp);
          
          const pic = fetchedApp.documents?.find((d: any) => d.document_type === 'profile_picture' || d.document_type === 'PROFILE_PICTURE');
          if (pic) {
            api.get(`/applications/documents/${pic.file_url}`, { responseType: 'blob' })
              .then(r => setProfilePicUrl(window.URL.createObjectURL(new Blob([r.data], { type: r.headers['content-type'] }))))
              .catch(err => console.error("Could not load profile pic", err));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-4">No application found</h2>
        <Button onClick={() => window.location.href = '/apply'}>
          Start Application
        </Button>
      </div>
    );
  }

  const Item = ({ label, value }: any) => (
    <div className="break-inside-avoid">
      <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</dt>
      <dd className="text-sm text-slate-900 font-medium">{value || <span className="text-slate-400 italic">N/A</span>}</dd>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white sm:rounded-xl sm:shadow-sm sm:border border-slate-200 p-4 sm:p-8 print:p-0 print:border-none print:shadow-none">
      
      {/* Print Header */}
      <div className="hidden print:flex flex-col items-center border-b-2 border-slate-900 pb-6 mb-6">
        <img src="/logo.jpg" alt="KALORA Logo" className="h-20 object-contain mb-3" />
        <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900">KALORA</h1>
        <h2 className="text-xl font-semibold uppercase text-slate-700 mt-1">Application Acknowledgement Slip</h2>
        <p className="text-sm text-slate-500 mt-2">Date Printed: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex justify-center mb-6 print:hidden">
        <div className="bg-green-100 p-3 rounded-full">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-center text-slate-900 mb-2 print:hidden">Application Submitted</h1>
      <p className="text-center text-slate-600 mb-8 print:hidden">
        Your application has been successfully submitted. Please print this acknowledgement for your records.
      </p>

      {/* Application Details Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4 print:border-slate-300 print:bg-white print:p-0 print:space-y-2">
            <h3 className="font-bold text-lg border-b pb-2 mb-4">Application Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Item label="Application Number" value={<span className="font-mono text-blue-700 font-bold">{app.application_number || 'Pending'}</span>} />
              <Item label="Status" value={<span className="uppercase tracking-wider">{app.status.replace('_', ' ')}</span>} />
              <Item label="Date Submitted" value={new Date(app.updated_at).toLocaleDateString()} />
              <Item label="Cohort / Year" value={app.cohort?.name || 'N/A'} />
            </div>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-6 print:border-slate-300 print:p-0 print:mt-4">
            <h3 className="font-bold text-lg border-b pb-2 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Item label="Full Name" value={app.user?.full_name} />
              <Item label="Email" value={app.user?.email} />
              <Item label="Phone" value={app.phone} />
              <Item label="Gender" value={app.gender} />
              <Item label="Date of Birth" value={app.dob} />
              <Item label="State of Origin / LGA" value={`${app.state_of_origin || ''} / ${app.lga || ''}`} />
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center print:border-slate-300">
            <div className="w-40 h-40 bg-slate-100 rounded-md mb-4 overflow-hidden border border-slate-200 flex items-center justify-center">
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 text-sm">No Photo</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Applicant Photo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border border-slate-200 rounded-lg p-6 print:border-slate-300 print:p-0">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Programme Selection</h3>
          <div className="space-y-4">
            <Item label="Intended Course" value={app.intended_course} />
            <Item label="Preferred Institution" value={app.preferred_institution} />
            <Item label="Intended JAMB Year" value={app.intended_jamb_year} />
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-6 print:border-slate-300 print:p-0">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Academic Information</h3>
          <div className="space-y-4">
            <Item label="School Name" value={app.school_name} />
            <Item label="Status" value={app.academic_status === 'secondary_graduate' ? 'Graduate' : 'Student'} />
            <Item label="Graduation Year" value={app.graduation_year} />
          </div>
        </div>
      </div>

      {app.academic_status === 'secondary_student' && app.documents?.find((d: any) => d.document_type === 'REPORT_CARD' || d.document_type === 'report_card') && (
        <div className="border border-slate-200 rounded-lg p-6 mb-8 print:border-slate-300 print:p-0">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Academic Documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <Item label="Latest Report Card" value={<span className="text-blue-600 font-semibold">Uploaded</span>} />
          </div>
        </div>
      )}

      {app.academic_status === 'secondary_graduate' && app.olevel_results?.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-6 mb-8 print:border-slate-300 print:p-0">
          <h3 className="font-bold text-lg border-b pb-2 mb-4">O'Level Results</h3>
          {app.olevel_results.map((ol: any, idx: number) => (
            <div key={idx} className="mb-4 last:mb-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Item label="Examination" value={`${ol.examination_type} (${ol.examination_year})`} />
                <Item label="Examination Number" value={ol.examination_number} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Subjects & Grades</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ol.subjects?.map((s: any, i: number) => (
                    <div key={i} className="bg-slate-50 px-3 py-2 border rounded text-xs flex justify-between print:border-none print:bg-transparent print:p-0 print:pr-4">
                      <span className="font-medium">{s.subject}</span>
                      <span className="text-blue-700 font-bold">{s.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 text-center text-sm text-slate-500 hidden print:block border-t pt-4">
        <p>This is an officially generated acknowledgement slip from the KALORA Admissions Portal.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 print:hidden pt-8 border-t border-slate-100 mt-8">
        {app.status === 'submitted' && (
          <Button variant="outline" onClick={() => window.location.href = '/apply?edit=true'}>
            Edit Application
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          Print Acknowledgement
        </Button>
        <Button variant="default" onClick={() => {
          localStorage.clear();
          window.location.href = '/login';
        }}>
          Log out
        </Button>
      </div>
    </div>
  );
}
