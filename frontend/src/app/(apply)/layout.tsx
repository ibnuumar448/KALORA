"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <img src="/logo.jpg" alt="KALORA Logo" className="h-8 object-contain" />
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Application Portal</span>
            </div>
            <div>
              <Link href="/login" onClick={() => localStorage.clear()} className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:mx-0">
        {children}
      </main>
    </div>
  );
}
