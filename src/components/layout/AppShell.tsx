import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { NAV_CONFIG } from '@/lib/navigation';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/rbac';
import { Activity, LogOut, Menu, X } from 'lucide-react';
import type { RoleName } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
  role: RoleName;
}

export function AppShell({ children, role }: AppShellProps) {
  const { staff, user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_CONFIG[role] ?? [];
  const displayName = staff?.full_name ?? user?.email ?? 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-secondary-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600 text-white">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-secondary-900 leading-tight">ClinicCare</h1>
          <p className="text-xs text-secondary-500">Management System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length === 2}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-secondary-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary-900 truncate">{displayName}</p>
            <span className={`badge ${ROLE_COLORS[role]} mt-0.5`}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="btn-ghost w-full mt-2 text-sm text-error-600 hover:bg-error-50 hover:text-error-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-white border-r border-secondary-200 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-white border-r border-secondary-200 z-50 lg:hidden animate-slide-in">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white border-b border-secondary-200">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary-100"
          >
            <Menu className="w-5 h-5 text-secondary-700" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" />
            <span className="font-bold text-secondary-900">ClinicCare</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
