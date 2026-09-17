import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <img src="/logo.jpg" alt="KALORA Logo" className="h-10 object-contain" />
              <span className="font-bold text-xl text-slate-900 tracking-tight">KALORA</span>
            </Link>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600 transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button>Apply Now</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col justify-center relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Preparing Students. <span className="text-blue-600">Opening Opportunities.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              The Karim Lamido Online Refresher Academy provides highly curated, world-class educational resources and guidance to help students excel in UTME examination.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">Start your journey</Button>
              </Link>
              <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600">
                Already admitted? Log in <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}