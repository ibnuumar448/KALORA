"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StepParent({ data, onNext, onBack }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      parent_name: data.parent_name || '',
      parent_relationship: data.parent_relationship || '',
      parent_phone: data.parent_phone || '',
      parent_email: data.parent_email || '',
      parent_address: data.parent_address || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6">
        <p className="text-sm text-blue-800">
          We collect this information to contact your parent or guardian regarding your application and progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Parent/Guardian Full Name</Label>
          <Input {...register('parent_name', { required: true })} />
          {errors.parent_name && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Input placeholder="e.g. Father, Mother, Uncle" {...register('parent_relationship', { required: true })} />
          {errors.parent_relationship && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input type="tel" {...register('parent_phone', { required: true })} />
          {errors.parent_phone && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Email Address (Optional)</Label>
          <Input type="email" {...register('parent_email')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address (If different from yours)</Label>
          <Input {...register('parent_address')} />
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Save & Continue</Button>
      </div>
    </form>
  );
}
