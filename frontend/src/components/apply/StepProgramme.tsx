"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// These could be fetched from backend config for the cohort
const AVAILABLE_SUBJECTS = ["Mathematics", "Use of English", "Physics", "Chemistry", "Biology"];

export default function StepProgramme({ data, onNext, onBack }: any) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: {
      intended_jamb_year: data.intended_jamb_year || new Date().getFullYear() + 1,
      intended_course: data.intended_course || '',
      preferred_institution: data.preferred_institution || '',
      selected_subjects: data.selected_subjects || []
    }
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Intended JAMB Year</Label>
          <Input type="number" {...register('intended_jamb_year', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Intended Course of Study</Label>
          <Input placeholder="e.g. Medicine, Computer Science" {...register('intended_course', { required: true })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Preferred Institution / University</Label>
          <Input placeholder="e.g. Ahmadu Bello University, Zaria" {...register('preferred_institution', { required: true })} />
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <Label>Intended JAMB Subjects</Label>
        <p className="text-sm text-slate-500">Select the subjects you intend to take in JAMB (Based on current programme availability).</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Controller
            name="selected_subjects"
            control={control}
            render={({ field }) => (
              <>
                {AVAILABLE_SUBJECTS.map((subject) => (
                  <label key={subject} className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      value={subject}
                      checked={field.value.includes(subject)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          field.onChange([...field.value, subject]);
                        } else {
                          field.onChange(field.value.filter((val: string) => val !== subject));
                        }
                      }}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-sm font-medium">{subject}</span>
                  </label>
                ))}
              </>
            )}
          />
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Save & Continue</Button>
      </div>
    </form>
  );
}
