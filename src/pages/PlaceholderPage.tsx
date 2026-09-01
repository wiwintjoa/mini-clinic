import { PageHeader } from '@/components/common/States';
import { Construction } from 'lucide-react';

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-100 mb-4">
          <Construction className="w-7 h-7 text-secondary-400" />
        </div>
        <h3 className="text-base font-semibold text-secondary-900">Coming Soon</h3>
        <p className="text-sm text-secondary-500 mt-1 max-w-md">
          This module is part of the clinic management system roadmap and will be implemented in an upcoming phase.
        </p>
      </div>
    </div>
  );
}
