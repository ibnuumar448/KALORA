"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider } from '@/contexts/SidebarContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden relative print:h-auto print:overflow-visible print:bg-white">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
            <Header />
            <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 print:p-0 print:overflow-visible print:bg-white">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
