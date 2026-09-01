import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { ListOrdered, CheckCircle2, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

export function DoctorDashboard() {
  const { staff } = useAuthStore();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['doctor-dashboard', staff?.id, today],
    queryFn: async () => {
      if (!staff?.id) return null;

      const [waiting, inConsult, completed] = await Promise.all([
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('doctor_id', staff.id).eq('status', 'WAITING'),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('doctor_id', staff.id).eq('status', 'IN_CONSULTATION'),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true })
          .eq('doctor_id', staff.id).eq('status', 'COMPLETED'),
      ]);

      return {
        waiting: waiting.count ?? 0,
        inConsultation: inConsult.count ?? 0,
        completed: completed.count ?? 0,
      };
    },
    enabled: !!staff?.id,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load dashboard data" />;

  return (
    <div>
      <PageHeader title="Doctor Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Waiting Patients" value={stats?.waiting ?? 0} icon={Clock} color="warning" />
        <StatCard label="In Consultation" value={stats?.inConsultation ?? 0} icon={Users} color="primary" />
        <StatCard label="Completed Today" value={stats?.completed ?? 0} icon={CheckCircle2} color="success" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Today's Queue</h3>
        <DoctorQueuePreview doctorId={staff?.id} />
      </div>
    </div>
  );
}

function DoctorQueuePreview({ doctorId }: { doctorId?: string }) {
  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ['doctor-queue-preview', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await supabase
        .from('queue_entries')
        .select('id, queue_number, status, patient:patients(full_name, mrn)')
        .eq('doctor_id', doctorId)
        .in('status', ['WAITING', 'CALLED', 'IN_CONSULTATION'])
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        queue_number: string;
        status: string;
        patient: { full_name: string; mrn: string } | null;
      }>;
    },
    enabled: !!doctorId,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load queue" />;
  if (!queue || queue.length === 0) {
    return <EmptyState icon={ListOrdered} title="No patients in queue" message="Patients will appear here once they check in." />;
  }

  const statusColors: Record<string, string> = {
    WAITING: 'bg-warning-100 text-warning-700 border-warning-200',
    CALLED: 'bg-accent-100 text-accent-700 border-accent-200',
    IN_CONSULTATION: 'bg-primary-100 text-primary-700 border-primary-200',
  };

  return (
    <div className="card divide-y divide-secondary-100">
      {queue.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary-100 text-secondary-700 font-semibold text-sm">
              {entry.queue_number}
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900">{entry.patient?.full_name ?? 'Unknown'}</p>
              <p className="text-xs text-secondary-500">{entry.patient?.mrn ?? '--'}</p>
            </div>
          </div>
          <span className={`badge ${statusColors[entry.status] ?? ''}`}>{entry.status.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  );
}
