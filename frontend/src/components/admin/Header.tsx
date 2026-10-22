import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, X, LayoutDashboard, Target, Users, LogOut, Settings, ShieldAlert, ClipboardList, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedProfileImage } from '@/components/AuthenticatedProfileImage';
import { api } from '@/lib/api';
import { cn } from '@/components/ui/button';

const navigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users, requireSuperAdmin: true },
  { name: 'Admissions', href: '/admin/admissions', icon: Users },
  { name: 'Curriculum', href: '/admin/curriculum', icon: BookOpen },
  { name: 'Assessments', href: '/admin/assessments', icon: ClipboardList },
  { name: 'Mentorship', href: '/admin/mentorship', icon: Users },
  { name: 'Discipline Mgmt', href: '/admin/disciplinary', icon: ShieldAlert, requireSuperAdmin: true },
  { name: 'My Discipline', href: '/admin/my-discipline', icon: ShieldAlert, requireSuperAdmin: false, hideForSuperAdmin: true },
  { name: 'Settings', href: '/admin/settings', icon: Settings, requireSuperAdmin: true },
];

export function AdminHeader() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const visibleNavigation = navigation.filter(
    (item) =>
      (!item.requireSuperAdmin || isSuperAdmin) &&
      !(isSuperAdmin && 'hideForSuperAdmin' in item && item.hideForSuperAdmin)
  );

  // Split navigation for desktop: first 5 items, rest in "More"
  const desktopVisible = visibleNavigation.slice(0, 5);
  const desktopMore = visibleNavigation.slice(5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left: Branding & Desktop Nav */}
          <div className="flex items-center">
            {/* Branding */}
            <Link href="/admin" className="flex items-center gap-2 flex-shrink-0 mr-8">
              <img src="/logo.jpg" alt="KALORA Logo" className="w-8 h-8 object-contain rounded" />
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">KALORA Admin</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {desktopVisible.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/admin');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive 
                        ? "bg-primary-light text-primary" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              
              {desktopMore.length > 0 && (
                <div
                  className="relative"
                  ref={moreMenuRef}
                  onMouseEnter={() => setMoreMenuOpen(true)}
                  onMouseLeave={() => setMoreMenuOpen(false)}
                >
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    aria-expanded={moreMenuOpen}
                    aria-haspopup="true"
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      desktopMore.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
                        ? "bg-primary-light text-primary"
                        : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                    )}
                  >
                    More <ChevronDown className="w-4 h-4" />
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute left-0 top-full z-50 w-48 pt-2">
                      <div className="rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {desktopMore.map(item => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setMoreMenuOpen(false)}
                              className={cn(
                                "block px-4 py-2 text-sm transition-colors",
                                isActive ? "bg-primary-light text-primary font-medium" : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                              )}
                            >
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Right: Notifications, Profile, Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            <button
              className="relative rounded-full p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile Dropdown / Link */}
            <Link href="/admin/profile" className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold uppercase overflow-hidden">
                {user?.profile_picture_url ? (
                  <AuthenticatedProfileImage fileKey={user.profile_picture_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.substring(0, 1) || 'A'
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-900 truncate max-w-[120px]">{user?.full_name || 'Administrator'}</div>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-2 ml-2 p-2 text-slate-500 hover:text-red-600 transition-colors rounded-md focus:outline-none"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center ml-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-50 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white shadow-lg absolute w-full left-0 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="px-4 pt-2 pb-4 space-y-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/admin');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold uppercase flex-shrink-0">
                  {user?.full_name?.substring(0, 1) || 'A'}
                </div>
                <div className="text-sm font-medium text-slate-900 truncate">{user?.full_name || 'Administrator'}</div>
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
