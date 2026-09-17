"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && allowedRoles.length > 0) {
        const hasAccess = allowedRoles.some((role) => 
          user.roles.some((userRole) => userRole.name === role)
        );
        if (!hasAccess) {
          // If they don't have access, redirect them to a safe place based on their role
          if (user.roles.some(r => r.name === 'admin' || r.name === 'super_admin')) {
            router.push('/admin');
          } else if (user.roles.some(r => r.name === 'mentor')) {
            router.push('/mentor');
          } else {
            router.push('/dashboard');
          }
        }
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500 font-medium">Authenticating...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some((role) => 
      user.roles.some((userRole) => userRole.name === role)
    );
    if (!hasAccess) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
