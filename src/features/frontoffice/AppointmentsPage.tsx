import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { AppointmentFormModal } from './appointments/AppointmentFormModal';
import { fetchAppointments, updateAppointmentStatus, checkInAppointment } from './appointments/queries';
import { CalendarPlus, CalendarDays, CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment, AppointmentStatus } from '@/types';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  BOOKED: 'bg-secondary-100 text-secondary-700 border-secondary-200',
  CONFIRMED: 'bg-accent-100 text-accent-700 border-accent-200',
  CHECKED_IN: 'bg-primary-100 text-primary-700 border-primary-200',
  IN_PROGRESS: 'bg-primary-100 text-primary-700 border-primary-200',
  COMPLETED: 'bg-success-100 text-success-700 border-success-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
  NO_SHOW: 'bg-warning-100 text-warning-700 border-warning-200',
};

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalOpen, setModalOpen] = useState(false);

  const { data: appointments, isLoading, isError } = useQuery<Appointment[]>({
    queryKey: ['appointments', date],
    queryFn: () => fetchAppointments(date),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, 'CONFIRMED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', date] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, 'CANCELLED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', date] }),
  });

  const checkInMutation = useMutation({
    mutationFn: (apt: Appointment) => checkInAppointment(apt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', date] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Schedule and manage patient appointments"
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <CalendarPlus className="w-4 h-4" />
            New Appointment
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-primary-600" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input max-w-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load appointments" />
      ) : !appointments || appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments" message="No appointments found for this date." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 text-secondary-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {appointments.map((apt) => {
                  const doctorName = (apt.doctor as unknown as { staff?: { full_name?: string } } | null)?.staff?.full_name ?? 'Unknown';
                  const patientName = (apt.patient as unknown as { full_name?: string } | null)?.full_name ?? 'Unknown';
                  const serviceName = (apt.service as unknown as { name?: string } | null)?.name ?? '--';
                  return (
                    <tr key={apt.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 font-medium text-secondary-900">{patientName}</td>
                      <td className="px-4 py-3 text-secondary-600">{doctorName}</td>
                      <td className="px-4 py-3 text-secondary-600">{serviceName}</td>
                      <td className="px-4 py-3 text-secondary-600">{apt.start_time} - {apt.end_time}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[apt.status]}`}>{apt.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {apt.status === 'BOOKED' && (
                            <button onClick={() => confirmMutation.mutate(apt.id)} className="btn-secondary text-xs" title="Confirm">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {(apt.status === 'BOOKED' || apt.status === 'CONFIRMED') && (
                            <>
                              <button onClick={() => checkInMutation.mutate(apt)} className="btn-primary text-xs" title="Check In">
                                <LogIn className="w-4 h-4" />
                              </button>
                              <button onClick={() => cancelMutation.mutate(apt.id)} className="btn-ghost text-error-600 p-1.5" title="Cancel">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AppointmentFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
