import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-primary-600 animate-spin mb-2" />
      <p className="text-sm text-secondary-500">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary-100 mb-3">
        <Icon className="w-6 h-6 text-secondary-400" />
      </div>
      <h3 className="text-sm font-semibold text-secondary-900">{title}</h3>
      <p className="text-sm text-secondary-500 mt-1 max-w-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
      <p>{message}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-secondary-900">{title}</h1>
        {subtitle && <p className="text-sm text-secondary-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
