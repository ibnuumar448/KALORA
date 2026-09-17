"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';

const WAEC_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Further Mathematics",
  "Economics",
  "Geography",
  "Civic Education",
  "Data Processing",
  "Literature in English",
  "Government",
  "Christian Religious Studies",
  "Islamic Studies",
  "Commerce",
  "Financial Accounting",
  "Computer Studies",
  "Technical Drawing",
  "Fine Art",
  "History",
  "French",
  "Hausa",
  "Igbo",
  "Yoruba",
  "Physical Education",
  "Animal Husbandry",
  "Fisheries",
  "Other"
];

export default function StepAcademic({ data, onNext, onBack }: any) {
  const [academicStatus, setAcademicStatus] = useState(data.academic_status || 'secondary_student');
  
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      academic_status: academicStatus,
      school_name: data.school_name || '',
      current_class: data.current_class || '',
      graduation_year: data.graduation_year || '',
      olevel_results: data.olevel_results?.[0] || {
        examination_type: '',
        examination_year: '',
        examination_number: '',
        candidate_number: '',
        subjects: [{ subject: '', grade: '' }]
      }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "olevel_results.subjects"
  });

  const watchStatus = watch("academic_status");

  const submitForm = (formData: any) => {
    if (watchStatus === 'secondary_student') {
      delete formData.olevel_results;
    }
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
      <div className="space-y-2">
        <Label>Academic Status</Label>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
          {...register('academic_status', { required: true })}
        >
          <option value="secondary_student">Secondary School Student</option>
          <option value="secondary_graduate">Secondary School Graduate</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <div className="space-y-2 md:col-span-2">
          <Label>Secondary School Name</Label>
          <Input {...register('school_name', { required: true })} />
        </div>
        
        {watchStatus === 'secondary_student' ? (
          <>
            <div className="space-y-2">
              <Label>Current Class / Level</Label>
              <Input {...register('current_class', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Expected Graduation Year</Label>
              <Input type="number" {...register('graduation_year', { required: true })} />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Year of Graduation</Label>
            <Input type="number" {...register('graduation_year', { required: true })} />
          </div>
        )}
      </div>

      {watchStatus === 'secondary_graduate' && (
        <div className="p-4 border border-slate-200 rounded-lg space-y-6">
          <h3 className="font-semibold text-slate-800">O'Level Examination Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Examination Type</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('olevel_results.examination_type', { required: true })}>
                <option value="">Select...</option>
                <option value="WAEC">WAEC</option>
                <option value="NECO">NECO</option>
                <option value="NABTEB">NABTEB</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Examination Year</Label>
              <Input type="number" {...register('olevel_results.examination_year', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Examination Number</Label>
              <Input {...register('olevel_results.examination_number', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Candidate Number (Optional)</Label>
              <Input {...register('olevel_results.candidate_number')} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">Subjects & Grades</h4>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Subject</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    {...register(`olevel_results.subjects.${index}.subject`, { required: true })}
                  >
                    <option value="">Select subject...</option>
                    {WAEC_SUBJECTS.map(subj => <option key={subj} value={subj}>{subj}</option>)}
                  </select>
                </div>
                <div className="w-32 space-y-2">
                  <Label className="text-xs">Grade</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register(`olevel_results.subjects.${index}.grade`, { required: true })}>
                    <option value="">...</option>
                    {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ subject: '', grade: '' })} className="flex gap-2">
              <Plus className="w-4 h-4" /> Add Subject
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Save & Continue</Button>
      </div>
    </form>
  );
}
