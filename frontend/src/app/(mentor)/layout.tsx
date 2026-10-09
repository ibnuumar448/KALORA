"use client";

import React, { useEffect, useState } from 'react';
import { MentorSidebar } from '@/components/mentor/Sidebar';
import { MentorHeader } from '@/components/mentor/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider } from '@/contexts/SidebarContext';

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ProtectedRoute allowedRoles={['mentor']}>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden relative">
          <div className="flex flex-1 flex-col overflow-hidden">
            <MentorHeader />
            <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
