"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [verificationEmailFailed, setVerificationEmailFailed] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationResendMessage, setVerificationResendMessage] = useState('');

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(pass)) return 'Password must contain at least one number';
    if (!/[@$!%*?&#^_-]/.test(pass)) return 'Password must contain at least one special character';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        full_name: fullName,
        email: email,
        password: password
      });
      
      setIsRegistered(true);
    } catch (err: unknown) {
      const response = axios.isAxiosError<{ detail?: string }>(err) ? err.response : undefined;
      const detail = response?.data?.detail;
      if (response?.status === 503 && detail?.includes('Account created')) {
        setIsRegistered(true);
        setVerificationEmailFailed(true);
        setError(detail);
      } else {
        setError(detail || 'Registration failed');
      }
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

  if (isRegistered) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-slate-100">
        <div className="bg-green-50 p-4 rounded-full inline-block mb-4">
          <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-900">
          {verificationEmailFailed ? 'Account Created' : 'Check Your Email'}
        </h3>
        {verificationEmailFailed ? (
          <>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mb-4 w-full"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
            >
              {isResendingVerification ? 'Requesting...' : 'Resend verification email'}
            </Button>
            {verificationResendMessage && (
              <p className="mb-4 text-sm text-slate-600" role="status">{verificationResendMessage}</p>
            )}
          </>
        ) : (
          <p className="text-slate-600 mb-6">
            A verification link was sent to <span className="font-medium text-slate-900">{email}</span>.
            Please check your inbox and verify your account before logging in.
          </p>
        )}
        <Link href="/login" className="w-full">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    );
  }

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

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
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
