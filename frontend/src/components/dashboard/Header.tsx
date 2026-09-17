import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

export function Header() {
  const { user } = useAuth();
  const { toggleSidebar, toggleMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-slate-200">
      <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-4">
          <button 
            onClick={toggleMobile}
            className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <button 
            onClick={toggleSidebar}
            className="hidden md:block text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="w-full max-w-lg lg:max-w-xs relative">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <Input
                id="search"
                name="search"
                className="pl-10 bg-slate-50 border-slate-200"
                placeholder="Search curriculum..."
                type="search"
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 gap-4">
          <button
            type="button"
            className="rounded-full bg-white p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Profile dropdown stub */}
          <div className="relative ml-3">
            <div className="flex items-center gap-3">
              <div className="text-sm text-right hidden md:block">
                <div className="font-medium text-slate-900">{user?.full_name || 'Student Name'}</div>
                <div className="text-slate-500 text-xs">Science UTME prep</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold uppercase">
                {user?.full_name?.substring(0, 1) || 'S'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
