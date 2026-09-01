import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { getHomeRoute } from '@/lib/rbac';
import { Activity, Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, initialized } = useAuthStore();
  const navigate = useNavigate();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { role } = useAuthStore();

  if (role && !allowed.includes(role)) {
    return <Navigate to={getHomeRoute(role)} replace />;
  }

  return <>{children}</>;
}
