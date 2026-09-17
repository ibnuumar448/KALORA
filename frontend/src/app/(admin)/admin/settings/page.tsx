"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (err) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings', { settings });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const prefixSetting = settings.find(s => s.key === 'admission_prefix') || { key: 'admission_prefix', value: 'KL/24/' };
  const passingScoreSetting = settings.find(s => s.key === 'passing_score_threshold') || { key: 'passing_score_threshold', value: '60' };
  const mentorCapacitySetting = settings.find(s => s.key === 'mentor_capacity') || { key: 'mentor_capacity', value: '10' };
  const mentorPolicySetting = settings.find(s => s.key === 'capacity_enforcement_policy') || { key: 'capacity_enforcement_policy', value: 'warning' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h2>
          <p className="text-slate-500 mt-1">Configure global platform behavior.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Configurations</CardTitle>
            <CardDescription>Configure admission rules and academic thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admission_prefix">Admission Number Prefix</Label>
              <Input 
                id="admission_prefix" 
                value={prefixSetting.value} 
                onChange={e => handleChange('admission_prefix', e.target.value)}
                placeholder="e.g. KL/24/"
              />
              <p className="text-xs text-slate-500">This prefix will be applied when new students are accepted.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passing_score_threshold">Global Passing Score (%)</Label>
              <Input 
                id="passing_score_threshold" 
                type="number"
                value={passingScoreSetting.value} 
                onChange={e => handleChange('passing_score_threshold', e.target.value)}
              />
              <p className="text-xs text-slate-500">Default passing score for assessments unless overridden.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mentorship Settings</CardTitle>
            <CardDescription>Configure mentor capacities and enforcement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mentor_capacity">Maximum Students Per Mentor</Label>
              <Input 
                id="mentor_capacity" 
                type="number"
                value={mentorCapacitySetting.value} 
                onChange={e => handleChange('mentor_capacity', e.target.value)}
              />
              <p className="text-xs text-slate-500">Global default maximum capacity.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity_enforcement_policy">Capacity Enforcement Policy</Label>
              <select 
                id="capacity_enforcement_policy"
                value={mentorPolicySetting.value}
                onChange={e => handleChange('capacity_enforcement_policy', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="strict">Strict Capacity Enforcement</option>
                <option value="warning">Warning-Based Capacity</option>
              </select>
              <p className="text-xs text-slate-500">Whether to block or warn when capacity is exceeded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
