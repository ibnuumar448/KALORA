import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, X, BookOpen, LayoutDashboard, Target, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedProfileImage } from '@/components/AuthenticatedProfileImage';
import { api } from '@/lib/api';
import { cn } from '@/components/ui/button';

const navigation = [
  { name: 'Student Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Curriculum', href: '/dashboard/curriculum', icon: BookOpen },
  { name: 'Assessments', href: '/dashboard/assessments', icon: Target },
  { name: 'Discipline', href: '/dashboard/discipline', icon: ShieldAlert },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const [listRes, countRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/notifications/unread-count')
        ]);
        setNotifications(listRes.data);
        setUnreadCount(countRes.data.unread_count);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000);
      window.addEventListener('refreshNotifications', fetchNotifs);
      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', fetchNotifs);
      };
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.type === 'mentorship_message' && notification.data?.assignment_id) {
      const assignmentId = notification.data.assignment_id as string;
      window.sessionStorage.setItem('kalora_pending_mentor_chat', assignmentId);
      if (pathname === '/dashboard') {
        window.dispatchEvent(new CustomEvent('openMentorChat', { detail: { assignmentId } }));
      } else {
        router.push('/dashboard');
      }
      setShowNotifDropdown(false);
    }
    if (!notification.is_read) await handleMarkAsRead(notification.id);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 print:hidden shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left: Branding & Desktop Nav */}
          <div className="flex items-center">
            {/* Branding */}
            <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 mr-8">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">KALORA</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary-light text-primary" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Notifications, Future Profile Area, Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative rounded-full p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!notif.is_read || notif.type === 'mentorship_message' ? 'bg-blue-50/50 cursor-pointer' : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm font-medium ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notif.title}
                            </p>
                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                              {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className={`text-xs ${!notif.is_read ? 'text-slate-700' : 'text-slate-500'}`}>
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown / Link */}
            <Link href="/dashboard/profile" className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold uppercase overflow-hidden">
                {user?.profile_picture_url ? (
                  <AuthenticatedProfileImage fileKey={user.profile_picture_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.substring(0, 1) || 'S'
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-900 truncate max-w-[150px]">{user?.full_name || 'Student Name'}</div>
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
            <div className="flex md:hidden items-center ml-2">
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
        <div className="md:hidden border-t border-slate-200 bg-white shadow-lg absolute w-full left-0">
          <nav className="px-4 pt-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href + '/'));
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
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold uppercase flex-shrink-0">
                  {user?.full_name?.substring(0, 1) || 'S'}
                </div>
                <div className="text-sm font-medium text-slate-900 truncate">{user?.full_name || 'Student Name'}</div>
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
