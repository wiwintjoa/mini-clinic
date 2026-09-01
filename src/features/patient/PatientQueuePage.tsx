import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Clock } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import type { QueueStatus } from '@/types';

const STATUS_COLORS: Record<QueueStatus, string> = {
  WAITING: 'bg-warning-100 text-warning-700 border-warning-200',
  CALLED: 'bg-accent-100 text-accent-700 border-accent-200',
  IN_CONSULTATION: 'bg-primary-100 text-primary-700 border-primary-200',
  COMPLETED: 'bg-success-100 text-success-700 border-success-200',
  SKIPPED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

export function PatientQueuePage() {
  const { user } = useAuthStore();

  const { data: patientId } = useQuery({
    queryKey: ['patient-self-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id').eq('auth_user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ['patient-queue', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queue_entries')
        .select('id, queue_number, status, created_at, doctor:doctors(specialty, staff:staff(full_name))')
        .eq('patient_id', patientId!)
        .in('status', ['WAITING', 'CALLED', 'IN_CONSULTATION'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string; queue_number: string; status: QueueStatus; created_at: string;
        doctor: { specialty: string; staff: { full_name: string } | null } | null;
      } | null;
    },
    enabled: !!patientId,
    refetchInterval: 10000,
  });

  return (
    <div>
      <PageHeader title="Queue Tracking" subtitle="Track your queue position" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load queue" /> : !queue ? (
        <EmptyState icon={Clock} title="Not in queue" message="You are not currently in the queue. Please check in at the front desk." />
      ) : (
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-100 text-primary-700 text-2xl font-bold mb-4">
            {queue.queue_number}
          </div>
          <h2 className="text-lg font-semibold text-secondary-900">{queue.doctor?.staff?.full_name ?? 'Unknown'}</h2>
          <p className="text-sm text-secondary-500">{queue.doctor?.specialty}</p>
          <span className={`badge mt-3 ${STATUS_COLORS[queue.status]}`}>{queue.status.replace('_', ' ')}</span>
          <p className="text-xs text-secondary-400 mt-3">
            Waiting time: {differenceInMinutes(new Date(), new Date(queue.created_at))} minutes
          </p>
        </div>
      )}
    </div>
  );
}
