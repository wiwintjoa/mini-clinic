import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader, LoadingState, ErrorState } from '@/components/common/States';
import { FileText, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export function PharmacistDashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['pharmacist-dashboard'],
    queryFn: async () => {
      const [pending, processing, ready, dispensed] = await Promise.all([
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'PROCESSING'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'READY'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'DISPENSED'),
      ]);

      return {
        pending: pending.count ?? 0,
        processing: processing.count ?? 0,
        ready: ready.count ?? 0,
        dispensed: dispensed.count ?? 0,
      };
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load dashboard data" />;

  return (
    <div>
      <PageHeader title="Pharmacy Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats?.pending ?? 0} icon={FileText} color="warning" />
        <StatCard label="Processing" value={stats?.processing ?? 0} icon={FileText} color="accent" />
        <StatCard label="Ready for Pickup" value={stats?.ready ?? 0} icon={CheckCircle2} color="primary" />
        <StatCard label="Dispensed" value={stats?.dispensed ?? 0} icon={CheckCircle2} color="success" />
      </div>

      <div className="mt-6 card p-5">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <a href="/pharmacy/prescriptions" className="btn-primary text-xs">View Prescriptions</a>
          <a href="/pharmacy/inventory" className="btn-secondary text-xs">Manage Inventory</a>
        </div>
      </div>
    </div>
  );
}
