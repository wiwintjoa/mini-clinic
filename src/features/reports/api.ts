import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/api/client';
export type ReportFilter = { dateFrom: string; dateTo: string; doctorId?: string; serviceId?: string };
export type ReportResult = { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> };
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;
export const useReport = (type: string, filter: ReportFilter) => useQuery({ queryKey: ['reports', type, filter], queryFn: async () => unwrap<ReportResult>(await api.get(`/reports/${type}`, { params: filter })) });
export const useReportReferences = () => { const doctors = useQuery({ queryKey: ['doctors'], queryFn: async () => unwrap<Array<{ id: string; fullName: string; specialty: string }>>(await api.get('/doctors')) }); const services = useQuery({ queryKey: ['services'], queryFn: async () => unwrap<Array<{ id: string; name: string }>>(await api.get('/services')) }); return { doctors, services }; };
export async function downloadReport(type: string, filter: ReportFilter) { const response = await api.get(`/reports/${type}/export`, { params: filter, responseType: 'blob' }); const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${type}-${filter.dateFrom}-${filter.dateTo}.csv`; anchor.click(); URL.revokeObjectURL(url); }
