"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function MentorDetailsPage({ params }: { params: { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string };
  const mentorId = resolvedParams.id;
  
  const router = useRouter();
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch all mentors and find this one (since we don't have a single mentor endpoint yet)
        const response = await api.get('/mentorship/mentors');
        const found = response.data.find((m: any) => m.id === mentorId);
        if (found) {
          setMentor(found);
        } else {
          toast.error("Mentor not found");
          router.push('/admin/mentorship');
        }
      } catch (err) {
        toast.error("Failed to fetch mentor details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [mentorId, router]);

  if (loading) {
    return <div className="p-8"><Skeleton className="h-32 w-full" /></div>;
  }

  if (!mentor) return null;

  const percent = Math.min(100, Math.round((mentor.assigned_count / mentor.capacity) * 100));
  const isFull = percent >= 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/mentorship')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{mentor.full_name}</h2>
          <p className="text-slate-500 mt-1">Role: Academic Mentor • {mentor.email}</p>
        </div>
        <div className="ml-auto">
          <Button disabled={isFull}>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Students
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Mentorship Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Capacity Utilization</span>
                <span className="font-medium">{mentor.assigned_count} / {mentor.capacity}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isFull ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{mentor.available_capacity} Available Spaces</p>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Students On Track</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Students At Risk</span>
                <span className="text-sm font-medium text-red-600 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> 0
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Assigned Students</CardTitle>
            <CardDescription>Students currently assigned to this mentor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-sm text-slate-500">
              Assigned students logic will be implemented in Phase 5.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
