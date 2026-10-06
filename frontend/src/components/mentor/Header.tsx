import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export function MentorHeader() {
  const { user } = useAuth();
  const { toggleSidebar, toggleMobile } = useSidebar();
  
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showDropdown, setShowDropdown] = React.useState(false);

  React.useEffect(() => {
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
                placeholder="Search your students..."
                type="search"
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative rounded-full bg-white p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md">
                  <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 hover:underline">
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
                        className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-emerald-50/50' : ''}`}
                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
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
        </div>
      </div>
    </header>
  );
}
