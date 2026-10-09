"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Target, Users, Bookmark, ArrowRight, Activity, MapPin, Mail } from 'lucide-react';

const subjects = [
  { id: 1, name: 'Mathematics', desc: 'Structured resources covering the KALORA Mathematics curriculum.' },
  { id: 2, name: 'Use of English', desc: 'Comprehensive guide to mastering the Use of English syllabus.' },
  { id: 3, name: 'Physics', desc: 'Learning resources organized around the JAMB Physics syllabus.' },
  { id: 4, name: 'Chemistry', desc: 'Detailed concepts and practice materials for Chemistry.' },
  { id: 5, name: 'Biology', desc: 'Curated biological science topics and structured lessons.' }
];

const steps = [
  { num: 1, title: 'Apply', desc: 'Submit your initial application with your details.' },
  { num: 2, title: 'Registration', desc: 'Complete your profile and academic history.' },
  { num: 3, title: 'Assessment', desc: 'Take the entry assessment to gauge your level.' },
  { num: 4, title: 'Admission', desc: 'Get formally admitted into your cohort.' },
  { num: 5, title: 'Learn & Mentor', desc: 'Access structured curriculum and expert mentors.' },
  { num: 6, title: 'Track Progress', desc: 'Monitor your scores, mastery, and ranking.' }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <nav className="max-w-7xl mx-auto flex items-center justify-between p-4 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1 items-center gap-2">
            <img src="/logo.jpg" alt="KALORA Logo" className="h-10 object-contain rounded" />
            <span className="font-bold text-xl tracking-tight text-primary">KALORA</span>
          </div>
          <div className="hidden lg:flex gap-8 items-center font-medium text-sm text-slate-600">
            <Link href="/" className="text-primary">Home</Link>
            <Link href="#about" className="hover:text-primary transition">About</Link>
            <Link href="#programme" className="hover:text-primary transition">Programme</Link>
            <Link href="#how-it-works" className="hover:text-primary transition">How It Works</Link>
            <Link href="#resources" className="hover:text-primary transition">Resources</Link>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-primary transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/register">
              <Button>Apply Now</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        
        {/* Hero Section */}
        <section className="relative isolate px-6 pt-20 pb-32 lg:px-8 bg-white overflow-hidden">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-light to-emerald-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>
          <motion.div 
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              className="mb-6 flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Institutional name container */}
              <span className="text-base font-medium text-slate-700 tracking-wide">
                Karim Lamido Online Refresher Academy
              </span>
              <div className="w-12 h-px bg-primary mt-3 opacity-70"></div>
            </motion.div>
            <motion.h1 
              className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              Structured learning. <br/>
              <span className="text-primary">Academic guidance.</span> <br/>
              A better path to success.
            </motion.h1>
            <motion.p 
              className="mt-6 text-lg leading-8 text-slate-600 mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              KALORA provides structured academic preparation, mentorship, and highly curated learning support to help students excel in the UTME examination and beyond.
            </motion.p>
            <motion.div 
              className="flex items-center justify-center gap-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
            >
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">Apply Now</Button>
              </Link>
              <Link href="#programme">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base border-slate-200">Explore Programme</Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Why KALORA Section */}
        <section id="about" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">Why KALORA?</h2>
              <p className="text-lg text-slate-600">
                Access to quality learning shouldn't be a barrier. We've built a community-driven platform that bridges the gap between raw potential and academic excellence.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-light hover:-translate-y-1 transition-all duration-300">
                <BookOpen className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">Structured Preparation</h3>
                <p className="text-slate-600">Move beyond random studying. Follow a meticulously planned curriculum designed for high-stakes exam success.</p>
              </div>
              <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-light hover:-translate-y-1 transition-all duration-300">
                <Users className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">Expert Mentorship</h3>
                <p className="text-slate-600">Get guidance from academic mentors who track your progress and provide targeted interventions when you need help.</p>
              </div>
              <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-light hover:-translate-y-1 transition-all duration-300">
                <Target className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">Continuous Assessment</h3>
                <p className="text-slate-600">Regular quizzes and mock examinations ensure you are always aware of your mastery level and areas for improvement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Programme & Resources Section */}
        <section id="resources" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-2">Curriculum & Resources</h2>
              <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">Curated Learning Resources</p>
              <p className="text-lg text-slate-600">
                Access carefully selected, curriculum-aligned learning resources to support your academic journey. KALORA brings together trusted educational content and organizes it around what you need to learn, practice, and master.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="group relative bg-slate-50 rounded-2xl p-8 hover:bg-primary-light transition-colors duration-300 border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{subject.name}</h3>
                  <p className="text-sm text-slate-600 mb-8">{subject.desc}</p>
                  <div className="absolute bottom-8 left-8 flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                    Explore Resources <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              ))}
            </div>

            <div id="programme" className="mt-20 bg-emerald-950 rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">The KALORA Learning System</h3>
                <p className="text-emerald-100 mb-6 leading-relaxed">
                  We don't just provide content; we provide a methodology. Every topic in our curriculum is structured to ensure comprehensive understanding.
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <Bookmark className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div><span className="font-bold block">Learn</span><span className="text-sm text-emerald-200">Curated external lessons</span></div>
                  </div>
                  <div className="flex gap-3">
                    <Target className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div><span className="font-bold block">Practice</span><span className="text-sm text-emerald-200">Exercises & assignments</span></div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div><span className="font-bold block">Assess</span><span className="text-sm text-emerald-200">Weekly topic evaluations</span></div>
                  </div>
                  <div className="flex gap-3">
                    <Activity className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div><span className="font-bold block">Track</span><span className="text-sm text-emerald-200">Monitor your mastery</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-center text-slate-900 sm:text-4xl mb-16">How KALORA Works</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.num} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission / Community */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission & Community</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Born from a desire to elevate educational standards in Northern Nigeria, KALORA is more than an academy—it is a community initiative. 
              We believe that with the right structure, digital curation, and dedicated mentorship, every student has the potential to excel and gain admission into their desired tertiary institution.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to begin your journey?</h2>
            <p className="text-emerald-100 mb-10 text-lg">Join the next cohort and take control of your academic preparation.</p>
            <div className="flex justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-slate-100 h-12 px-8 text-base font-semibold">Apply to KALORA</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="border-emerald-700 bg-transparent text-white hover:bg-emerald-800 hover:text-white h-12 px-8 text-base">Sign In</Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl tracking-tight text-white">KALORA</span>
            </div>
            <p className="text-sm max-w-sm leading-relaxed mb-6">
              Karim Lamido Online Refresher Academy. <br/>
              Providing structured learning and mentorship for academic success.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="#programme" className="hover:text-white transition">Curriculum</Link></li>
              <li><Link href="/register" className="hover:text-white transition">Admissions</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Student Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4"/> Karim Lamido, Taraba State</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4"/> info@kalora.edu.ng</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} KALORA. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}