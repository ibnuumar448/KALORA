import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img src="/logo.jpg" alt="KALORA Logo" className="h-20 object-contain mb-4" />
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          KALORA
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Karim Lamido Online Refresher Academy
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
