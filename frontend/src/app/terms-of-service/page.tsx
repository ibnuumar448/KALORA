import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-4">
            Welcome to the Karim Lamido Online Refresher Academy (KALORA). These Terms of Service govern your use of our website and academic platform. By accessing or using our services, you agree to be bound by these terms.
          </p>
          
          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="text-slate-600 mb-4">
            By registering for an account or submitting an application, you agree to abide by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the platform immediately.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">2. User Registration and Accounts</h2>
          <p className="text-slate-600 mb-4">
            You may be required to register with the site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine it is inappropriate.
          </p>
          <p className="text-slate-600 mb-4">
            When creating an account, you represent and warrant that all registration information you submit will be true, accurate, current, and complete. If you are a minor, you must have the consent of, and be directly supervised by, a parent or guardian to use the platform.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">3. Academic Integrity and Conduct</h2>
          <p className="text-slate-600 mb-4">
            As a student or applicant of KALORA, you agree to maintain the highest standards of academic integrity. Any form of cheating, falsification of documents, or disruptive behavior on the platform may result in immediate suspension or expulsion from the academy.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">4. Intellectual Property Rights</h2>
          <p className="text-slate-600 mb-4">
            Unless otherwise indicated, the platform is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the site are owned or controlled by us, and are protected by copyright and trademark laws.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">5. Modifications and Interruptions</h2>
          <p className="text-slate-600 mb-4">
            We reserve the right to change, modify, or remove the contents of the site at any time or for any reason at our sole discretion without notice. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
