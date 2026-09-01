import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState } from '@/components/common/States';
import { StatCard } from '@/components/common/StatCard';
import { Users, CalendarDays, Receipt, Pill, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ReportStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  totalPrescriptions: number;
  byDay: { date: string; appointments: number; revenue: number; prescriptions: number }[];
}

const formatRupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export function AdminReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));

  const { data: stats, isLoading, isError } = useQuery<ReportStats>({
    queryKey: ['admin-reports', from, to],
    queryFn: async () => {
      const [patients, appointments, payments, prescriptions] = await Promise.all([
        supabase.from('patients').select('id, created_at', { count: 'exact' }),
        supabase.from('appointments').select('id, appointment_date').gte('appointment_date', from).lte('appointment_date', to),
        supabase.from('payments').select('amount, created_at').eq('status', 'PAID').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
        supabase.from('prescriptions').select('id, created_at').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
      ]);

      const totalRevenue = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAppointments = appointments.data?.length ?? 0;
      const totalPrescriptions = prescriptions.data?.length ?? 0;
      const totalPatients = (patients.data ?? []).filter((p) => {
        const d = p.created_at?.slice(0, 10);
        return d && d >= from && d <= to;
      }).length;

      // Build per-day breakdown
      const dayMap = new Map<string, { appointments: number; revenue: number; prescriptions: number }>();
      (appointments.data ?? []).forEach((a) => {
        const d = a.appointment_date;
        if (!dayMap.has(d)) dayMap.set(d, { appointments: 0, revenue: 0, prescriptions: 0 });
        dayMap.get(d)!.appointments++;
      });
      (payments.data ?? []).forEach((p) => {
        const d = (p.created_at ?? '').slice(0, 10);
        if (!dayMap.has(d)) dayMap.set(d, { appointments: 0, revenue: 0, prescriptions: 0 });
        dayMap.get(d)!.revenue += Number(p.amount);
      });
      (prescriptions.data ?? []).forEach((p) => {
        const d = (p.created_at ?? '').slice(0, 10);
        if (!dayMap.has(d)) dayMap.set(d, { appointments: 0, revenue: 0, prescriptions: 0 });
        dayMap.get(d)!.prescriptions++;
      });

      const byDay = Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { totalPatients, totalAppointments, totalRevenue, totalPrescriptions, byDay };
    },
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Clinic performance overview" />
      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium text-secondary-700">From</label>
          <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-secondary-700">To</label>
          <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load report data" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="New Patients" value={stats?.totalPatients ?? 0} icon={Users} color="primary" subtitle={`${from} → ${to}`} />
            <StatCard label="Appointments" value={stats?.totalAppointments ?? 0} icon={CalendarDays} color="accent" />
            <StatCard label="Revenue" value={formatRupiah(stats?.totalRevenue ?? 0)} icon={Receipt} color="success" />
            <StatCard label="Prescriptions" value={stats?.totalPrescriptions ?? 0} icon={Pill} color="warning" />
          </div>

          <div className="card overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-secondary-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary-500" />
              <h3 className="text-sm font-semibold text-secondary-900">Daily Breakdown</h3>
            </div>
            {!stats || stats.byDay.length === 0 ? (
              <p className="p-4 text-sm text-secondary-400">No data for the selected range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 text-secondary-600 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium text-right">Appointments</th>
                    <th className="px-4 py-2 font-medium text-right">Prescriptions</th>
                    <th className="px-4 py-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {stats.byDay.map((d) => (
                    <tr key={d.date} className="hover:bg-secondary-50">
                      <td className="px-4 py-2 text-secondary-900">{format(new Date(d.date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-2 text-right text-secondary-700">{d.appointments}</td>
                      <td className="px-4 py-2 text-right text-secondary-700">{d.prescriptions}</td>
                      <td className="px-4 py-2 text-right text-secondary-700">{formatRupiah(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
