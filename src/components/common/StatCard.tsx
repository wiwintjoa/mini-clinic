import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'accent';
  subtitle?: string;
}

const COLOR_MAP = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', icon: 'bg-primary-100 text-primary-600' },
  success: { bg: 'bg-success-50', text: 'text-success-600', icon: 'bg-success-100 text-success-600' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', icon: 'bg-warning-100 text-warning-600' },
  error: { bg: 'bg-error-50', text: 'text-error-600', icon: 'bg-error-100 text-error-600' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-600', icon: 'bg-accent-100 text-accent-600' },
};

export function StatCard({ label, value, icon: Icon, color = 'primary', subtitle }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary-500">{label}</p>
          <p className="text-2xl font-bold text-secondary-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-secondary-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${c.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
