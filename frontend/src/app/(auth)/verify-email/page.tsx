"use client";

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const attemptedToken = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? 'Verifying your email...' : 'No verification token provided in the URL.'
  );
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    if (attemptedToken.current === token) return;
    attemptedToken.current = token;

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now log in.');
      } catch (err: unknown) {
        const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined;
        setStatus('error');
        setMessage(detail || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verify();
  }, [token]);

  const handleResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsResending(true);
    setResendMessage('');
    try {
      const response = await api.post('/auth/resend-verification', { email });
      setResendMessage(response.data.message);
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined;
      setResendMessage(
        detail || 'The verification email could not be sent. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg shadow-sm border border-slate-100">
      <h3 className="text-2xl font-semibold mb-6 text-slate-900">Email Verification</h3>

      {status === 'loading' && (
        <div className="text-slate-600 flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-green-600 flex flex-col items-center">
          <div className="bg-green-50 p-3 rounded-full mb-4">
            <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mb-6 text-slate-700">{message}</p>
          <Link href="/login" className="w-full">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="text-red-600 flex flex-col items-center">
          <div className="bg-red-50 p-3 rounded-full mb-4">
            <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="mb-6 text-slate-700">{message}</p>
          <form onSubmit={handleResend} className="mb-6 w-full space-y-3 text-left">
            <Label htmlFor="resendEmail">Request a new verification link</Label>
            <Input
              id="resendEmail"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isResending}
              placeholder="Email address"
            />
            <Button type="submit" variant="outline" className="w-full" disabled={isResending}>
              {isResending ? 'Requesting...' : 'Resend verification email'}
            </Button>
            {resendMessage && (
              <p className="text-sm text-slate-600" role="status">{resendMessage}</p>
            )}
          </form>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center p-8 text-slate-500">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
