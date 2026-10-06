"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';

export default function StepDocuments({ data, onNext, onBack }: any) {
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Track uploaded documents (extract from data if we load them)
  const [docs, setDocs] = useState<any>(
    data.documents?.reduce((acc: any, doc: any) => ({ ...acc, [doc.document_type.toUpperCase()]: doc }), {}) || {}
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append('document_type', type);
      formData.append('file', file);
      
      const res = await api.post(`/applications/${data.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setDocs({ ...docs, [type]: res.data });
      toast.success(`${type.replace('_', ' ')} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const isRequired = (type: string) => {
    if (type === 'PROFILE_PICTURE') return true;
    if (type === 'OLEVEL_RESULT' && data.academic_status === 'secondary_graduate') return true;
    if (type === 'REPORT_CARD' && data.academic_status !== 'secondary_graduate') return true;
    return false;
  };

  const validateAndNext = () => {
    if (!docs['PROFILE_PICTURE']) {
      toast.error("Profile picture is required");
      return;
    }
    if (data.academic_status === 'secondary_graduate' && !docs['OLEVEL_RESULT']) {
      toast.error("O'Level result is required for graduates");
      return;
    }
    if (data.academic_status !== 'secondary_graduate' && !docs['REPORT_CARD']) {
      toast.error("Report card / transcript is required for students");
      return;
    }
    onNext({}); // State is already handled on backend for files, just advance
  };

  const UploadBox = ({ type, title, description, accept }: any) => {
    const doc = docs[type];
    const isUp = uploading === type;
    
    return (
      <div className={`border rounded-lg p-6 flex flex-col items-center justify-center text-center ${doc ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 border-dashed'}`}>
        {doc ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
            <p className="font-semibold text-green-900 text-sm mb-1">{doc.original_filename}</p>
            <p className="text-xs text-green-700 mb-4">Uploaded successfully</p>
            <div className="relative">
              <input type="file" accept={accept} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleUpload(e, type)} />
              <Button size="sm" variant="outline" className="bg-white">Replace File</Button>
            </div>
          </>
        ) : (
          <>
            {isUp ? (
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            ) : (
              <UploadCloud className="w-10 h-10 text-slate-400 mb-4" />
            )}
            <h4 className="font-semibold text-slate-800 mb-1">{title} {isRequired(type) && <span className="text-red-500">*</span>}</h4>
            <p className="text-xs text-slate-500 mb-4 max-w-xs">{description}</p>
            <div className="relative">
              <input type="file" accept={accept} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleUpload(e, type)} disabled={isUp} />
              <Button size="sm" disabled={isUp}>Select File</Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadBox 
          type="PROFILE_PICTURE" 
          title="Profile Picture" 
          description="A clear, recent passport photograph. Max size 5MB. (JPG, PNG)"
          accept="image/jpeg, image/png, image/webp"
        />
        
        {data.academic_status === 'secondary_graduate' ? (
          <UploadBox 
            type="OLEVEL_RESULT" 
            title="O'Level Result" 
            description="Your WAEC, NECO, or NABTEB statement of result. Max 5MB. (PDF, JPG, PNG)"
            accept="image/jpeg, image/png, application/pdf"
          />
        ) : (
          <UploadBox 
            type="REPORT_CARD" 
            title="Latest Report Card" 
            description="Your most recent school term report card or transcript. Max 5MB. (PDF, JPG, PNG)"
            accept="image/jpeg, image/png, application/pdf"
          />
        )}
      </div>
      
      <div className="flex justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={validateAndNext}>Save & Continue</Button>
      </div>
    </div>
  );
}
