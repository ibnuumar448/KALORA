import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-4">
            At Karim Lamido Online Refresher Academy (KALORA), we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our application portal.
          </p>
          
          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-slate-600 mb-4">
            We collect personal information that you voluntarily provide to us when registering for the academy, expressing an interest in obtaining information about us, or otherwise contacting us. The personal information that we collect depends on the context of your interactions with us and the choices you make, and may include:
          </p>
          <ul className="list-disc pl-5 text-slate-600 mb-4 space-y-2">
            <li>Names, phone numbers, email addresses, and contact preferences.</li>
            <li>Demographic data such as gender, date of birth, and state of origin.</li>
            <li>Academic records and institutional preferences.</li>
            <li>Uploaded documents (e.g., profile pictures, results).</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-slate-600 mb-4">
            We use personal information collected via our website for a variety of educational and administrative purposes described below:
          </p>
          <ul className="list-disc pl-5 text-slate-600 mb-4 space-y-2">
            <li>To facilitate account creation and the admission process.</li>
            <li>To manage user accounts and provide academic mentorship.</li>
            <li>To communicate administrative information, such as curriculum updates and assessments.</li>
            <li>To maintain the security and operation of our platform.</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">3. Information Sharing and Disclosure</h2>
          <p className="text-slate-600 mb-4">
            We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We do not sell your personal information to third parties.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">4. Data Retention</h2>
          <p className="text-slate-600 mb-4">
            We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">5. Contact Us</h2>
          <p className="text-slate-600 mb-4">
            If you have questions or comments about this notice, you may email us at info@kalora.edu.ng or contact us at our physical address in Karim Lamido, Taraba State.
          </p>
        </div>
      </div>
    </div>
  );
}
