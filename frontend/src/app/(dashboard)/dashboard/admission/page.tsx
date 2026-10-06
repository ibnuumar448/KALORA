"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintLayout } from '@/components/print/PrintLayout';

export default function AdmissionLetterPage() {
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await api.get('/applications/me');
        if (res.data && res.data.length > 0) {
          setApp(res.data[0]);
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no application or not admitted, don't show the letter.
  if (!app || (app.status !== 'admitted' && app.status !== 'accepted')) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto mt-10">
        <h2 className="text-xl font-semibold mb-2">Admission Pending</h2>
        <p className="text-slate-600 mb-6">Your admission letter is not yet available. Please wait until your application status is updated to 'Admitted'.</p>
      </div>
    );
  }

  const LetterContent = () => (
    <>
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

      <div className="flex justify-end mt-20 pt-8 border-t-2 border-slate-200">
        <div className="text-right">
          <p className="font-bold italic text-emerald-900 text-xl font-serif mb-2">Saminu Umar</p>
          <p className="text-sm text-slate-600">Registrar, KALORA</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="print:hidden max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admission Letter</h1>
            <p className="text-slate-600">Congratulations on your admission to KALORA.</p>
          </div>
          <Button onClick={() => window.print()} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print Letter
          </Button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-black">
          <div className="flex flex-col items-center border-b-4 border-slate-900 pb-6 mb-8">
            <img src="/logo.jpg" alt="KALORA Logo" className="h-24 object-contain mb-4" />
            <h1 className="text-4xl font-bold uppercase tracking-widest text-slate-900">KALORA</h1>
            <h2 className="text-lg font-semibold uppercase text-slate-600 mt-1">Karim Lamido Online Refresher Academy</h2>
          </div>
          <LetterContent />
        </div>
      </div>

      <PrintLayout 
        title="Provisional Admission Letter"
        documentRef={`ADM/${new Date().getFullYear()}/${app.admission_number || '0000'}`}
      >
        <div className="text-black max-w-4xl mx-auto px-4 mt-8">
          <LetterContent />
        </div>
      </PrintLayout>
    </>
  );
}
