import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { CalendarDays, Clock, FileText, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export function PatientDashboard() {
  const { user } = useAuthStore();

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient-self', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ['patient-upcoming', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, end_time, status, doctor:doctors!inner(specialty, staff:staff(full_name))')
        .eq('patient_id', patient.id)
        .in('status', ['BOOKED', 'CONFIRMED'])
        .order('appointment_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        appointment_date: string;
        start_time: string;
        end_time: string;
        status: string;
        doctor: { specialty: string; staff: { full_name: string } | null } | null;
      }>;
    },
    enabled: !!patient?.id,
  });

  if (patientLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle={`Welcome, ${patient?.full_name ?? 'Patient'}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Upcoming Appointments" value={upcoming?.length ?? 0} icon={CalendarDays} color="primary" />
        <StatCard label="Queue Position" value="--" icon={Clock} color="accent" />
        <StatCard label="Prescriptions" value="--" icon={FileText} color="success" />
        <StatCard label="Outstanding Bills" value="--" icon={Receipt} color="warning" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Upcoming Appointments</h3>
        {upcomingLoading ? (
          <LoadingState />
        ) : !upcoming || upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming appointments" message="You have no scheduled appointments. Book one from the Appointments page." />
        ) : (
          <div className="card divide-y divide-secondary-100">
            {upcoming.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    {apt.doctor?.staff?.full_name ?? 'Doctor'}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {format(new Date(apt.appointment_date), 'MMM d, yyyy')} at {apt.start_time}
                  </p>
                </div>
                <span className="badge bg-primary-100 text-primary-700 border-primary-200">{apt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
