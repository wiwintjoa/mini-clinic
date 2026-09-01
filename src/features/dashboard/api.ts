import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/api/client';

export type DashboardAppointment = { id: string; startTime: string; status: string; patientName: string; mrn: string; doctorName: string; serviceName: string };
export type DashboardQueueItem = { id: string; queueNumber: string; status: string; checkedInAt: string; patientName: string; mrn: string; doctorName: string };
export type DashboardAlert = { label: string; value: number; tone: 'ok' | 'warning' | 'danger'; href: string };
export type DashboardData = {
  title: string;
  generatedAt: string;
  clinicTimeZone?: string;
  cards: Array<{ label: string; value: number; format?: 'currency' }>;
  appointments?: DashboardAppointment[];
  queue?: DashboardQueueItem[];
  alerts?: DashboardAlert[];
};

export const useDashboard = () => useQuery({
  queryKey: ['dashboard'],
  queryFn: async () => (await api.get<{ data: DashboardData }>('/dashboard')).data.data,
  refetchInterval: 30_000,
});
