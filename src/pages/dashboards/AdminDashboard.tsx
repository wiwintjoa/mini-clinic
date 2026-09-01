import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Users, CalendarDays, Receipt, Package, AlertTriangle, Clock, TrendingUp, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';

export function AdminDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard', today],
    queryFn: async () => {
      const [patients, appointments, doctors, lowStockMedicines] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('medicines').select('id, name, minimum_stock').eq('is_active', true),
      ]);

      const lowStock = (lowStockMedicines.data ?? []).filter((m) => {
        // Would need stock calculation; for now show count
        return false;
      });

      return {
        totalPatients: patients.count ?? 0,
        todayAppointments: appointments.count ?? 0,
        totalDoctors: doctors.count ?? 0,
        activeMedicines: lowStockMedicines.data?.length ?? 0,
      };
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load dashboard data" />;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} color="primary" />
        <StatCard label="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={CalendarDays} color="accent" />
        <StatCard label="Doctors" value={stats?.totalDoctors ?? 0} icon={Stethoscope} color="success" />
        <StatCard label="Active Medicines" value={stats?.activeMedicines ?? 0} icon={Package} color="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-secondary-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <a href="/admin/doctors" className="btn-secondary text-xs">Manage Doctors</a>
            <a href="/admin/staff" className="btn-secondary text-xs">Manage Staff</a>
            <a href="/admin/services" className="btn-secondary text-xs">Manage Services</a>
            <a href="/admin/reports" className="btn-secondary text-xs">View Reports</a>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-secondary-900 mb-3">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-500">Database</span>
              <span className="badge bg-success-100 text-success-700 border-success-200">Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-500">Authentication</span>
              <span className="badge bg-success-100 text-success-700 border-success-200">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
