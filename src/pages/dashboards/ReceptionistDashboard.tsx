import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader, LoadingState, ErrorState } from '@/components/common/States';
import { CalendarDays, ListOrdered, Users, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export function ReceptionistDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['receptionist-dashboard', today],
    queryFn: async () => {
      const [appointments, queue, checkins] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('status', 'WAITING'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'CHECKED_IN'),
      ]);

      return {
        todayAppointments: appointments.count ?? 0,
        waitingQueue: queue.count ?? 0,
        checkedIn: checkins.count ?? 0,
      };
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load dashboard data" />;

  return (
    <div>
      <PageHeader title="Front Office Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={CalendarDays} color="accent" />
        <StatCard label="Waiting in Queue" value={stats?.waitingQueue ?? 0} icon={ListOrdered} color="warning" />
        <StatCard label="Checked In" value={stats?.checkedIn ?? 0} icon={Users} color="success" />
      </div>

      <div className="mt-6 card p-5">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a href="/front-office/patients" className="btn-primary text-xs">Register Patient</a>
          <a href="/front-office/appointments" className="btn-secondary text-xs">New Appointment</a>
          <a href="/front-office/queue" className="btn-secondary text-xs">Manage Queue</a>
          <a href="/front-office/billing" className="btn-secondary text-xs">Billing</a>
        </div>
      </div>
    </div>
  );
}
