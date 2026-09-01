import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { getHomeRoute } from '@/lib/rbac';
import { Activity, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { signIn, loading, user, role, initialized } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (initialized && user && role) {
    return <Navigate to={getHomeRoute(role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      // After sign in, the store will have user/role set
      // Navigate based on role
      const state = useAuthStore.getState();
      if (state.role) {
        navigate(getHomeRoute(state.role), { replace: true });
      } else {
        setError('Unable to determine user role. Please contact an administrator.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200 mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">ClinicCare</h1>
          <p className="text-sm text-secondary-500 mt-1">Small Clinic Management System</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-secondary-900 mb-1">Welcome back</h2>
          <p className="text-sm text-secondary-500 mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.local"
                  required
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-secondary-100">
            <p className="text-xs text-secondary-400 font-medium mb-2">Demo Accounts:</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-secondary-500">
              <div className="flex justify-between"><span>Admin</span><code>admin@clinic.local</code></div>
              <div className="flex justify-between"><span>Receptionist</span><code>receptionist@clinic.local</code></div>
              <div className="flex justify-between"><span>Doctor</span><code>doctor@clinic.local</code></div>
              <div className="flex justify-between"><span>Pharmacist</span><code>pharmacist@clinic.local</code></div>
            </div>
            <p className="text-xs text-secondary-400 mt-2">Password for all: <code>clinic123</code></p>
          </div>
        </div>

        <p className="text-center text-xs text-secondary-400 mt-6">
          ClinicCare v1.0 - Outpatient Clinic Management
        </p>
      </div>
    </div>
  );
}

