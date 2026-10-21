"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(pass)) return 'Password must contain at least one number';
    if (!/[@$!%*?&#^_-]/.test(pass)) return 'Password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing reset token.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setStatus('error');
      setMessage(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/reset-password', { token, new_password: password });
      setStatus('success');
      setMessage(response.data.message || 'Password has been successfully reset.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'An error occurred. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-slate-100">
        <h3 className="text-2xl font-semibold mb-4 text-slate-900">Invalid Link</h3>
        <p className="text-slate-600 mb-6">No password reset token was provided in the URL.</p>
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">Back to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-center text-slate-900">Choose a new password</h3>
      <p className="text-center text-sm text-slate-500 mb-6">
        Create a strong password that you haven't used before.
      </p>

      {status === 'success' && (
        <div className="mb-6 p-4 rounded-md bg-green-50 flex flex-col items-center border border-green-200 text-center">
          <svg className="h-10 w-10 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-700 text-sm mb-4">{message}</p>
          <Link href="/login" className="w-full">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
          {message}
        </div>
      )}

      {status !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center p-8 text-slate-500">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
