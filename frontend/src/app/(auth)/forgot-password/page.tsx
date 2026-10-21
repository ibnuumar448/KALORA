"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage(response.data.message || 'If that email exists in our system, a password reset link has been sent.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-center text-slate-900">Reset your password</h3>
      <p className="text-center text-sm text-slate-500 mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {status === 'success' && (
        <div className="mb-6 p-4 rounded-md bg-green-50 text-green-700 text-sm border border-green-200 text-center">
          {message}
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 rounded-md bg-red-50 text-red-700 text-sm border border-red-200 text-center">
          {message}
        </div>
      )}

      {status !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="name@example.com"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending link...' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-600">
        Remembered your password?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
