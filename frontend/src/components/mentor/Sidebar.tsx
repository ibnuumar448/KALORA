import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Users, LogOut, MessageSquare, X } from 'lucide-react';
import { cn } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

const navigation = [
  { name: 'My Students', href: '/mentor', icon: Users },
  { name: 'Interventions', href: '/mentor/interventions', icon: MessageSquare },
];

export function MentorSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

  const sidebarClasses = cn(
    "flex h-full flex-col bg-emerald-950 border-r border-emerald-900 transition-all duration-300",
    isCollapsed ? "w-20" : "w-64",
    "fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0",
    isMobileOpen ? "translate-x-0" : "-translate-x-full"
  );

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-emerald-950/80 backdrop-blur-sm md:hidden" 
          onClick={closeMobile}
        />
      )}
      <div className={sidebarClasses}>
        <div className={cn("flex h-16 items-center border-b border-emerald-900 flex-shrink-0", isCollapsed ? "justify-center px-0" : "px-6 justify-between")}>
          <div className="flex items-center gap-2 overflow-hidden">
            <BookOpen className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <h1 className={cn("text-xl font-bold tracking-tight text-white whitespace-nowrap transition-opacity", isCollapsed && "hidden")}>
              KALORA Mentor
            </h1>
          </div>
          <button onClick={closeMobile} className="md:hidden text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pt-6 pb-4">
          <nav className="flex-1 space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    isActive 
                      ? "bg-emerald-900 text-white" 
                      : "text-slate-300 hover:bg-emerald-900 hover:text-white",
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={() => isMobileOpen && closeMobile()}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                      "h-5 w-5 flex-shrink-0",
                      !isCollapsed && "mr-3"
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t border-emerald-900 p-4 overflow-hidden">
          <div className={cn("mb-4 flex items-center gap-3", isCollapsed ? "justify-center px-0" : "px-3")}>
              <div 
                className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0"
                title={isCollapsed ? user?.full_name || 'Academic Mentor' : undefined}
              >
                {user?.full_name?.substring(0, 2) || 'MT'}
              </div>
              {!isCollapsed && (
                <div className="text-sm min-w-0">
                  <div className="font-medium text-white truncate">{user?.full_name || 'Academic Mentor'}</div>
                  <div className="text-slate-400 text-xs">Mentor</div>
                </div>
              )}
          </div>
          <button
            onClick={logout}
            title={isCollapsed ? "Sign out" : undefined}
            className={cn(
              "group flex w-full items-center rounded-md py-2 text-sm font-medium text-slate-300 hover:bg-emerald-900 hover:text-white transition-colors",
              isCollapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <LogOut className={cn("h-5 w-5 text-slate-400 group-hover:text-white flex-shrink-0", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </>
  );
}
