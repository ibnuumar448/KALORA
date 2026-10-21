"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationResendMessage, setVerificationResendMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsEmailVerification(false);
    setVerificationResendMessage('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      const userResponse = await api.get<{ roles: { name: string }[] }>('/auth/me');
      const roles = userResponse.data.roles.map((role) => role.name);
      
      toast.success('Logged in successfully');

      if (roles.includes('super_admin') || roles.includes('admin')) {
        window.location.href = '/admin';
      } else if (roles.includes('mentor')) {
        window.location.href = '/mentor';
      } else {
        // Check application status
        try {
          const appsResponse = await api.get('/applications/me');
          const apps = appsResponse.data;
          if (apps && apps.length > 0) {
            const latestApp = apps[0];
            if (latestApp.status === 'draft' || latestApp.status === 'applied') {
              window.location.href = '/apply';
            } else if (latestApp.status === 'accepted') {
              window.location.href = '/dashboard';
            } else {
              window.location.href = '/application-status';
            }
          } else {
            window.location.href = '/apply';
          }
        } catch {
          window.location.href = '/apply';
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<{ detail?: string }>(err) && err.response?.headers?.['x-error-code'] === 'email_not_verified') {
        setNeedsEmailVerification(true);
      }
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined;
      toast.error(detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    setVerificationResendMessage('');
    try {
      const response = await api.post('/auth/resend-verification', { email });
      setVerificationResendMessage(response.data.message);
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined;
      setVerificationResendMessage(
        detail || 'The verification email could not be sent. Please try again later.'
      );
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-center text-slate-900">Sign in to your account</h3>
      {needsEmailVerification && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>Verify your email address before logging in.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={handleResendVerification}
            disabled={isResendingVerification || !email}
          >
            {isResendingVerification ? 'Requesting...' : 'Resend verification email'}
          </Button>
          {verificationResendMessage && (
            <p className="mt-2" role="status">{verificationResendMessage}</p>
          )}
        </div>
      )}
      {/* <p className="text-center text-xs text-slate-500 mb-6">
        Test Pilot Accounts: <br />
        <span className="font-mono">saminu@gmail.com</span> (Admin)<br />
        <span className="font-mono">ismail@gmail.com</span> (Mentor)<br />
        <span className="font-mono">yushau@gmail.com</span> (Student)<br />
        <span className="text-slate-400 italic">Password for all: <strong>admin123</strong> (admin), <strong>mentor123</strong>, <strong>student123</strong></span>
      </p> */}

      <form onSubmit={handleLogin} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
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
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:text-primary">
          Apply now
        </Link>
      </p>
    </div>
  );
}
