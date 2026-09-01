import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { CalendarPlus, CalendarDays, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes } from 'date-fns';
import type { AppointmentStatus } from '@/types';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  BOOKED: 'bg-secondary-100 text-secondary-700 border-secondary-200',
  CONFIRMED: 'bg-accent-100 text-accent-700 border-accent-200',
  CHECKED_IN: 'bg-primary-100 text-primary-700 border-primary-200',
  IN_PROGRESS: 'bg-primary-100 text-primary-700 border-primary-200',
  COMPLETED: 'bg-success-100 text-success-700 border-success-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
  NO_SHOW: 'bg-warning-100 text-warning-700 border-warning-200',
};

const bookSchema = z.object({
  doctor_id: z.string().min(1, 'Select a doctor'),
  service_id: z.string().min(1, 'Select a service'),
  appointment_date: z.string().min(1, 'Select a date'),
  start_time: z.string().min(1, 'Select a time'),
  notes: z.string().optional().or(z.literal('')),
});
type BookFormValues = z.input<typeof bookSchema>;

export function PatientAppointmentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: patientId } = useQuery({
    queryKey: ['patient-self-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id').eq('auth_user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, end_time, status, notes, doctor:doctors(specialty, staff:staff(full_name)), service:services(name)')
        .eq('patient_id', patientId!)
        .order('appointment_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; appointment_date: string; start_time: string; end_time: string; status: AppointmentStatus; notes: string | null;
        doctor: { specialty: string; staff: { full_name: string } | null } | null;
        service: { name: string } | null;
      }>;
    },
    enabled: !!patientId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').update({ status: 'CANCELLED' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-appointments', patientId] }),
  });

  const upcoming = appointments?.filter((a) => ['BOOKED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)) ?? [];
  const past = appointments?.filter((a) => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) ?? [];

  return (
    <div>
      <PageHeader title="My Appointments" subtitle="Book and manage your appointments"
        action={<button onClick={() => setModalOpen(true)} className="btn-primary"><CalendarPlus className="w-4 h-4" /> Book Appointment</button>} />

      {isLoading ? <LoadingState /> : !appointments || appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments" message="Book your first appointment to get started." />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 mb-2">Upcoming</h3>
            {upcoming.length === 0 ? <p className="text-sm text-secondary-500">No upcoming appointments.</p> : (
              <div className="card divide-y divide-secondary-100">
                {upcoming.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{a.doctor?.staff?.full_name ?? 'Unknown'} · {a.doctor?.specialty}</p>
                      <p className="text-xs text-secondary-500">{format(new Date(a.appointment_date), 'MMM d, yyyy')} at {a.start_time}</p>
                      {a.service && <p className="text-xs text-secondary-400">{a.service.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status.replace('_', ' ')}</span>
                      {(a.status === 'BOOKED' || a.status === 'CONFIRMED') && (
                        <button onClick={() => cancelMutation.mutate(a.id)} className="btn-ghost text-xs text-error-600">Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 mb-2">Past</h3>
              <div className="card divide-y divide-secondary-100">
                {past.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{a.doctor?.staff?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-secondary-500">{format(new Date(a.appointment_date), 'MMM d, yyyy')} at {a.start_time}</p>
                    </div>
                    <span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && patientId && <BookModal patientId={patientId} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function BookModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(bookSchema) });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('doctors').select('id, specialty, staff:staff(full_name)').eq('staff.is_active', true);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; specialty: string; staff: { full_name: string } | null }>;
    },
  });
  const { data: services } = useQuery({
    queryKey: ['services-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name, duration_minutes').eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; duration_minutes: number }>;
    },
  });

  const serviceId = watch('service_id');
  const startTime = watch('start_time');
  const selectedService = services?.find((s) => s.id === serviceId);
  const endTime = selectedService && startTime ? format(addMinutes(new Date(`2000-01-01T${startTime}`), selectedService.duration_minutes), 'HH:mm') : '';

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const { error } = await supabase.from('appointments').insert({
        patient_id: patientId,
        doctor_id: v.doctor_id,
        service_id: v.service_id,
        appointment_date: v.appointment_date,
        start_time: v.start_time,
        end_time: endTime,
        status: 'BOOKED',
        notes: v.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-appointments', patientId] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Book Appointment</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v as Record<string, unknown>))} className="space-y-3">
          <div><label className="text-sm font-medium text-secondary-700">Doctor</label>
            <select className="input mt-1" {...register('doctor_id')}>
              <option value="">Select...</option>
              {doctors?.map((d) => <option key={d.id} value={d.id}>{d.staff?.full_name ?? 'Unknown'} — {d.specialty}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-secondary-700">Service</label>
            <select className="input mt-1" {...register('service_id')}>
              <option value="">Select...</option>
              {services?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-secondary-700">Date</label><input type="date" className="input mt-1" {...register('appointment_date')} /></div>
            <div><label className="text-sm font-medium text-secondary-700">Time</label><input type="time" className="input mt-1" {...register('start_time')} /></div>
          </div>
          <div><label className="text-sm font-medium text-secondary-700">Notes</label><textarea className="input mt-1" rows={2} {...register('notes')} /></div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</> : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
