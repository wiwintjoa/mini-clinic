import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { StatCard } from '@/components/common/StatCard';
import { QueueEntry, QueueStatus, Visit } from '@/types';
import { Clock, Users, CheckCircle2, ListOrdered, PhoneCall, Stethoscope, Check } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { QueueEntryRow } from './QueueEntryRow';

const STATUS_COLORS: Record<QueueStatus, string> = {
  WAITING: 'bg-warning-100 text-warning-700 border-warning-200',
  CALLED: 'bg-accent-100 text-accent-700 border-accent-200',
  IN_CONSULTATION: 'bg-primary-100 text-primary-700 border-primary-200',
  COMPLETED: 'bg-success-100 text-success-700 border-success-200',
  SKIPPED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

interface QueueRow {
  id: string;
  queue_number: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  status: QueueStatus;
  created_at: string;
  updated_at: string;
  patient?: { full_name: string; mrn: string } | null;
}

export function DoctorQueuePage() {
  const { staff } = useAuthStore();
  const queryClient = useQueryClient();
  const doctorId = staff?.id ?? null;
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: queue, isLoading, isError } = useQuery<QueueRow[]>({
    queryKey: ['doctor-queue', doctorId, today],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await supabase
        .from('queue_entries')
        .select('id, queue_number, patient_id, doctor_id, appointment_id, status, created_at, updated_at, patient:patients(full_name, mrn)')
        .eq('doctor_id', doctorId)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
    enabled: !!doctorId,
    refetchInterval: 15000,
  });

  const counts = {
    waiting: queue?.filter((q) => q.status === 'WAITING' || q.status === 'CALLED').length ?? 0,
    inProgress: queue?.filter((q) => q.status === 'IN_CONSULTATION').length ?? 0,
    completed: queue?.filter((q) => q.status === 'COMPLETED').length ?? 0,
  };

  const callPatient = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('queue_entries')
        .update({ status: 'CALLED' as QueueStatus, updated_at: new Date().toISOString() })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => invalidateQueue(queryClient, doctorId, today),
  });

  const startConsultation = useMutation({
    mutationFn: async (entry: QueueRow) => {
      const visitPayload = {
        patient_id: entry.patient_id,
        doctor_id: entry.doctor_id,
        appointment_id: entry.appointment_id,
        queue_entry_id: entry.id,
        visit_date: new Date().toISOString(),
        status: 'IN_PROGRESS',
      };
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert(visitPayload)
        .select('id')
        .single<Visit>();
      if (visitError) throw visitError;
      const { error: queueError } = await supabase
        .from('queue_entries')
        .update({ status: 'IN_CONSULTATION' as QueueStatus, updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      if (queueError) throw queueError;
      return visit;
    },
    onSuccess: () => invalidateQueue(queryClient, doctorId, today),
  });

  const completeConsultation = useMutation({
    mutationFn: async (entry: QueueRow) => {
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('queue_entry_id', entry.id);
      if (visitError) throw visitError;
      const { error: queueError } = await supabase
        .from('queue_entries')
        .update({ status: 'COMPLETED' as QueueStatus, updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      if (queueError) throw queueError;
    },
    onSuccess: () => invalidateQueue(queryClient, doctorId, today),
  });

  if (isLoading) return <LoadingState message="Loading queue..." />;
  if (isError) return <ErrorState message="Failed to load the queue. Please try again." />;

  return (
    <div>
      <PageHeader title="Today's Queue" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Waiting" value={counts.waiting} icon={Clock} color="warning" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Users} color="primary" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} color="success" />
      </div>

      {!queue || queue.length === 0 ? (
        <EmptyState icon={ListOrdered} title="No patients in queue" message="Patients will appear here once they check in at the front desk." />
      ) : (
        <div className="card divide-y divide-secondary-100">
          {queue.map((entry) => {
            const waitMinutes = differenceInMinutes(new Date(), new Date(entry.created_at));
            const activeVisit = entry.status === 'IN_CONSULTATION';
            return (
              <QueueEntryRow
                key={entry.id}
                entry={entry}
                waitMinutes={waitMinutes}
                statusColor={STATUS_COLORS[entry.status]}
                isCalling={callPatient.isPending && callPatient.variables === entry.id}
                isStarting={startConsultation.isPending && startConsultation.variables?.id === entry.id}
                isCompleting={completeConsultation.isPending && completeConsultation.variables?.id === entry.id}
                onCall={() => callPatient.mutate(entry.id)}
                onStart={() => startConsultation.mutate(entry)}
                onComplete={() => completeConsultation.mutate(entry)}
                activeVisit={activeVisit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function invalidateQueue(qc: ReturnType<typeof useQueryClient>, doctorId: string | null, today: string) {
  qc.invalidateQueries({ queryKey: ['doctor-queue', doctorId, today] });
  qc.invalidateQueries({ queryKey: ['doctor-dashboard', doctorId, today] });
}
