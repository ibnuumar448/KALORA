"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

import StepPersonal from '@/components/apply/StepPersonal';
import StepAcademic from '@/components/apply/StepAcademic';
import StepProgramme from '@/components/apply/StepProgramme';
import StepParent from '@/components/apply/StepParent';
import StepDocuments from '@/components/apply/StepDocuments';
import StepReview from '@/components/apply/StepReview';

const STEPS = [
  "Personal Information",
  "Academic Information",
  "Programme Selection",
  "Parent/Guardian Information",
  "Documents",
  "Review & Submit"
];

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [applicationData, setApplicationData] = useState<any>({});
  
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Fetch cohorts to find an active one
      const cohortsRes = await api.get('/curriculum/cohorts').catch(() => ({ data: [] }));
      const activeCohort = cohortsRes.data[0];
      setCohorts(cohortsRes.data);

      if (!activeCohort) {
         toast.error("Registration is currently closed");
         setIsLoading(false);
         return;
      }

      const appsRes = await api.get('/applications/me');
      if (appsRes.data && appsRes.data.length > 0) {
        const latest = appsRes.data[0];
        const urlParams = new URLSearchParams(window.location.search);
        const isEdit = urlParams.get('edit') === 'true';

        if (!isEdit && (latest.status === 'submitted' || latest.status === 'under_review')) {
          window.location.href = '/application-status';
          return;
        }
        
        // Prevent editing if application is locked
        if (isEdit && latest.status !== 'draft' && latest.status !== 'applied' && latest.status !== 'submitted') {
          toast.error("Application is locked and cannot be edited");
          window.location.href = '/application-status';
          return;
        }

        setApplicationData({ ...latest, cohort_id: latest.cohort_id });
      } else {
        // Init empty
        setApplicationData({ cohort_id: activeCohort.id, academic_status: 'secondary_student' });
      }
    } catch (e) {
      toast.error('Failed to load application data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async (stepData: any) => {
    const newData = { ...applicationData, ...stepData };
    setApplicationData(newData);
    await saveDraft(newData);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const saveDraft = async (data: any = applicationData) => {
    setIsSaving(true);
    try {
      const res = await api.post(`/applications/draft?cohort_id=${data.cohort_id}`, data);
      setApplicationData({ ...data, id: res.data.id });
    } catch (e) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const payload: any = {};
      
      // Only include olevel_results if they are a graduate and it's an object, not an array
      if (applicationData.academic_status === 'secondary_graduate' && applicationData.olevel_results && !Array.isArray(applicationData.olevel_results)) {
        payload.olevel_results = applicationData.olevel_results;
      }

      await api.post(`/applications/${applicationData.id}/submit`, payload);
      toast.success('Application submitted successfully!');
      window.location.href = '/application-status';
    } catch (e: any) {
      let errorMsg = 'Failed to submit application';
      if (e.response?.data?.detail) {
        errorMsg = Array.isArray(e.response.data.detail) 
          ? e.response.data.detail.map((err: any) => err.msg || err).join(', ') 
          : e.response.data.detail;
      }
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Applications are currently closed</h2>
        <p className="text-slate-600">Please check back later for our next intake.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Step {currentStep + 1} of {STEPS.length}</h2>
          <span className="text-sm font-medium text-slate-500">{STEPS[currentStep]}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {currentStep === 0 && <StepPersonal data={applicationData} onNext={handleNext} />}
        {currentStep === 1 && <StepAcademic data={applicationData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 2 && <StepProgramme data={applicationData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <StepParent data={applicationData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <StepDocuments data={applicationData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 5 && <StepReview data={applicationData} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={isSaving} />}
      </div>
    </div>
  );
}
