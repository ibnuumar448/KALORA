"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StepPersonal({ data, onNext }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      dob: data.dob || '',
      gender: data.gender || '',
      phone: data.phone || '',
      state_of_origin: data.state_of_origin || '',
      lga: data.lga || '',
      town: data.town || '',
      residential_address: data.residential_address || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input type="date" {...register('dob', { required: true })} />
          {errors.dob && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('gender', { required: true })}>
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input type="tel" {...register('phone', { required: true })} />
          {errors.phone && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>State of Origin</Label>
          <Input {...register('state_of_origin', { required: true })} />
          {errors.state_of_origin && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>LGA</Label>
          <Input {...register('lga', { required: true })} />
          {errors.lga && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2">
          <Label>Town / Community</Label>
          <Input {...register('town', { required: true })} />
          {errors.town && <span className="text-red-500 text-sm">Required</span>}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Residential Address</Label>
          <Input {...register('residential_address', { required: true })} />
          {errors.residential_address && <span className="text-red-500 text-sm">Required</span>}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button type="submit">Save & Continue</Button>
      </div>
    </form>
  );
}
