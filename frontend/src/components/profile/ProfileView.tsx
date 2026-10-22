"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Save, X, User as UserIcon } from 'lucide-react';
import { AuthenticatedProfileImage } from '@/components/AuthenticatedProfileImage';
import { api } from '@/lib/api';

export function ProfileView() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    whatsapp_link: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        whatsapp_link: user.whatsapp_link || '',
      });
      
      // If student, try to fetch application data
      if (user.roles.some(r => r.name === 'student')) {
        api.get('/applications/me').then(res => {
          if (res.data && res.data.length > 0) {
            setApplicationData(res.data[0]); // Get most recent application
          }
        }).catch(err => console.error("Could not fetch app data", err));
      }
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/users/me', formData);
      await refreshUser();
      setIsEditing(false);
      // Can add toast here if needed
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
    } catch (error) {
      console.error("Failed to upload picture", error);
      alert("Failed to upload profile picture.");
    }
  };

  if (!user) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-slate-500">Manage your account information and preferences.</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Account Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center">
                  {user.profile_picture_url ? (
                    <AuthenticatedProfileImage fileKey={user.profile_picture_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-slate-300" />
                  )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 rounded-full text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  title="Change picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 text-center">{user.full_name}</h3>
              <p className="text-sm text-slate-500 capitalize mb-4">
                {user.roles.map(r => r.name.replace('_', ' ')).join(', ')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Personal & Academic Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic details about you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  {isEditing ? (
                    <Input 
                      id="full_name" 
                      value={formData.full_name} 
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                    />
                  ) : (
                    <div className="py-2 text-slate-900">{user.full_name}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="py-2 text-slate-500">{user.email} (Read-only)</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      placeholder="+234..."
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    />
                  ) : (
                    <div className="py-2 text-slate-900">{user.phone || 'Not provided'}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_link">WhatsApp Number/Link</Label>
                  {isEditing ? (
                    <Input 
                      id="whatsapp_link" 
                      value={formData.whatsapp_link} 
                      placeholder="e.g. wa.me/234..."
                      onChange={(e) => setFormData({...formData, whatsapp_link: e.target.value})} 
                    />
                  ) : (
                    <div className="py-2 text-slate-900">{user.whatsapp_link || 'Not provided'}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application specific info for students */}
          {user.roles.some(r => r.name === 'student') && (
            <Card>
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Details retrieved from your official application record.</CardDescription>
              </CardHeader>
              <CardContent>
                {!applicationData ? (
                  <div className="text-sm text-slate-500">
                    No completed application found. 
                    <a href="/register" className="ml-2 text-emerald-600 hover:underline">Complete your application</a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs uppercase">Application Status</Label>
                      <div className="font-medium capitalize">{applicationData.status.replace('_', ' ')}</div>
                    </div>
                    {applicationData.application_number && (
                      <div className="space-y-1">
                        <Label className="text-slate-500 text-xs uppercase">Admission Number</Label>
                        <div className="font-medium">{applicationData.application_number}</div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs uppercase">Current School</Label>
                      <div className="font-medium">{applicationData.school_name || 'Not specified'}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs uppercase">Intended Course</Label>
                      <div className="font-medium">{applicationData.intended_course || 'Not specified'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
