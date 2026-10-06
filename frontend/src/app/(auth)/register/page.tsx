"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        full_name: fullName,
        email: email,
        password: password
      });
      
      // Auto login after registration
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      window.location.href = '/apply';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-center text-slate-900">Apply for Admission</h3>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input 
            id="fullName" 
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
            placeholder="Amina Yusuf"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"}
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account & Apply'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already applied?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
