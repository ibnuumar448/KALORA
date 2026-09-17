"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function StepReview({ data, onSubmit, onBack, isSubmitting }: any) {
  
  const Section = ({ title, children }: any) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
        {children}
      </div>
    </div>
  );

  const Item = ({ label, value }: any) => (
    <div>
      <dt className="text-slate-500 font-medium mb-1">{label}</dt>
      <dd className="text-slate-900 font-medium">{value || <span className="text-slate-400 italic">Not provided</span>}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Ready to Submit?</h4>
        <p className="text-sm text-blue-700">
          Please review your information carefully. You can still return to edit your application later, provided the admissions team hasn't processed it yet.
        </p>
      </div>

      <Section title="Personal Information">
        <Item label="Date of Birth" value={data.dob} />
        <Item label="Gender" value={data.gender} />
        <Item label="Phone Number" value={data.phone} />
        <Item label="State of Origin" value={data.state_of_origin} />
        <Item label="LGA" value={data.lga} />
        <Item label="Town" value={data.town} />
        <Item label="Residential Address" value={data.residential_address} />
      </Section>

      <Section title="Academic Information">
        <Item label="Status" value={data.academic_status === 'secondary_graduate' ? 'Secondary School Graduate' : 'Secondary School Student'} />
        <Item label="School Name" value={data.school_name} />
        {data.academic_status === 'secondary_student' ? (
          <>
            <Item label="Current Class" value={data.current_class} />
            <Item label="Expected Graduation Year" value={data.graduation_year} />
          </>
        ) : (
          <Item label="Graduation Year" value={data.graduation_year} />
        )}
      </Section>

      {data.academic_status === 'secondary_graduate' && data.olevel_results && (
        <Section title="O'Level Details">
          <Item label="Examination" value={`${data.olevel_results.examination_type} (${data.olevel_results.examination_year})`} />
          <Item label="Examination Number" value={data.olevel_results.examination_number} />
          <div className="sm:col-span-2 mt-2">
            <p className="text-slate-500 font-medium mb-2">Subjects & Grades</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.olevel_results.subjects?.map((s: any, i: number) => (
                <div key={i} className="bg-slate-100 px-3 py-2 rounded text-xs flex justify-between">
                  <span className="font-semibold">{s.subject}</span>
                  <span className="text-blue-700 font-bold">{s.grade}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section title="Programme Selection">
        <Item label="Intended JAMB Year" value={data.intended_jamb_year} />
        <Item label="Intended Course" value={data.intended_course} />
        <Item label="Preferred Institution" value={data.preferred_institution} />
        <div className="sm:col-span-2">
          <Item label="Selected Subjects" value={data.selected_subjects?.join(', ')} />
        </div>
      </Section>

      <Section title="Parent/Guardian Information">
        <Item label="Name" value={data.parent_name} />
        <Item label="Relationship" value={data.parent_relationship} />
        <Item label="Phone" value={data.parent_phone} />
        <Item label="Email" value={data.parent_email} />
      </Section>

      <div className="flex justify-between pt-6 border-t border-slate-200 mt-8">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>Back to Edit</Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
        </Button>
      </div>
    </div>
  );
}
