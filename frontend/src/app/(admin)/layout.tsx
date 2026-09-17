"use client";

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { AdminHeader } from '@/components/admin/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider } from '@/contexts/SidebarContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden relative">
          <AdminSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
