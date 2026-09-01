import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { StatCard } from '@/components/common/StatCard';
import { Clock, Users, CheckCircle2, ListOrdered, PhoneCall, Stethoscope, Check, SkipForward } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import type { QueueStatus } from '@/types';

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
  patient: { full_name: string; mrn: string } | null;
  doctor: { specialty: string; staff: { full_name: string } | null } | null;
}

export function QueuePage() {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: queue, isLoading, isError } = useQuery<QueueRow[]>({
    queryKey: ['queue', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queue_entries')
        .select('id, queue_number, patient_id, doctor_id, appointment_id, status, created_at, updated_at, patient:patients(full_name, mrn), doctor:doctors(specialty, staff:staff(full_name))')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
    refetchInterval: 15000,
  });

  const callPatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('queue_entries').update({ status: 'CALLED' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue', today] }),
  });

  const startConsultation = useMutation({
    mutationFn: async (entry: QueueRow) => {
      const { data: visit, error: vErr } = await supabase.from('visits').insert({
        patient_id: entry.patient_id,
        doctor_id: entry.doctor_id,
        appointment_id: entry.appointment_id,
        queue_entry_id: entry.id,
        visit_date: new Date().toISOString(),
        status: 'IN_PROGRESS',
      }).select('id').single();
      if (vErr) throw vErr;
      const { error: qErr } = await supabase.from('queue_entries').update({ status: 'IN_CONSULTATION' }).eq('id', entry.id);
      if (qErr) throw qErr;
      return visit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue', today] }),
  });

  const completeEntry = useMutation({
    mutationFn: async (entry: QueueRow) => {
      await supabase.from('visits').update({ status: 'COMPLETED' }).eq('queue_entry_id', entry.id);
      const { error } = await supabase.from('queue_entries').update({ status: 'COMPLETED' }).eq('id', entry.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue', today] }),
  });

  const skipEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('queue_entries').update({ status: 'SKIPPED' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue', today] }),
  });

  const counts = {
    waiting: queue?.filter((q) => q.status === 'WAITING' || q.status === 'CALLED').length ?? 0,
    inProgress: queue?.filter((q) => q.status === 'IN_CONSULTATION').length ?? 0,
    completed: queue?.filter((q) => q.status === 'COMPLETED').length ?? 0,
  };

  const activeQueue = queue?.filter((q) => ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(q.status)) ?? [];
  const completedQueue = queue?.filter((q) => ['COMPLETED', 'SKIPPED'].includes(q.status)) ?? [];

  return (
    <div>
      <PageHeader title="Queue Management" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Waiting" value={counts.waiting} icon={Clock} color="warning" />
        <StatCard label="In Consultation" value={counts.inProgress} icon={Users} color="primary" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} color="success" />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load queue" />
      ) : !queue || queue.length === 0 ? (
        <EmptyState icon={ListOrdered} title="Queue is empty" message="Patients will appear here after check-in." />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 mb-2">Active Queue</h3>
            {!activeQueue || activeQueue.length === 0 ? (
              <p className="text-sm text-secondary-500">No active patients.</p>
            ) : (
              <div className="card divide-y divide-secondary-100">
                {activeQueue.map((entry) => {
                  const waitMin = differenceInMinutes(new Date(), new Date(entry.created_at));
                  return (
                    <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary-100 text-secondary-700 font-semibold">
                          {entry.queue_number}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">{entry.patient?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-secondary-500">
                            {entry.patient?.mrn ?? '--'} · {entry.doctor?.staff?.full_name ?? 'Unknown'} · {waitMin}m wait
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${STATUS_COLORS[entry.status]}`}>{entry.status.replace('_', ' ')}</span>
                        {entry.status === 'WAITING' && (
                          <button onClick={() => callPatient.mutate(entry.id)} className="btn-secondary text-xs">
                            <PhoneCall className="w-3.5 h-3.5" /> Call
                          </button>
                        )}
                        {entry.status === 'CALLED' && (
                          <button onClick={() => startConsultation.mutate(entry)} className="btn-primary text-xs">
                            <Stethoscope className="w-3.5 h-3.5" /> Start
                          </button>
                        )}
                        {entry.status === 'IN_CONSULTATION' && (
                          <button onClick={() => completeEntry.mutate(entry)} className="btn-primary text-xs">
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                        {entry.status !== 'IN_CONSULTATION' && entry.status !== 'COMPLETED' && (
                          <button onClick={() => skipEntry.mutate(entry.id)} className="btn-ghost text-xs text-secondary-500">
                            <SkipForward className="w-3.5 h-3.5" /> Skip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {completedQueue && completedQueue.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 mb-2">Completed / Skipped</h3>
              <div className="card divide-y divide-secondary-100">
                {completedQueue.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary-50 text-secondary-500 font-medium text-sm">
                        {entry.queue_number}
                      </div>
                      <div>
                        <p className="text-sm text-secondary-700">{entry.patient?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-secondary-400">{entry.doctor?.staff?.full_name ?? '--'}</p>
                      </div>
                    </div>
                    <span className={`badge ${STATUS_COLORS[entry.status]}`}>{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
