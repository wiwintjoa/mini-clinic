import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../app/api/client';

export type InvoiceListItem = { id: string; invoiceNumber: string; invoiceDate: string; status: string; grandTotal: string; amountPaid: string; patientName: string; mrn: string };
export type InvoiceDetail = InvoiceListItem & { visitId: string; patientId: string; subtotal: string; discount: string; tax: string; balance: string; items: Array<{ id: string; type: string; description: string; quantity: number; unitPrice: string; total: string }>; payments: Array<{ id: string; paymentNumber: string; amount: string; method: string; paidAt: string }> };
export type UnbilledVisit = { id: string; completedAt: string; patientName: string; mrn: string; serviceName: string | null };
export type PaginatedInvoices = { data: InvoiceListItem[]; meta: { page: number; limit: number; total: number; totalPages: number } };
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const useInvoices = (page: number, search: string) => useQuery({ queryKey: ['billing', page, search], queryFn: async () => (await api.get<PaginatedInvoices>('/billing', { params: { page, limit: 20, search: search || undefined } })).data, placeholderData: keepPreviousData });
export const useInvoice = (id: string | null) => useQuery({ queryKey: ['billing', 'detail', id], queryFn: async () => unwrap<InvoiceDetail>(await api.get(`/billing/${id}`)), enabled: Boolean(id) });
export const useUnbilledVisits = () => useQuery({ queryKey: ['billing', 'unbilled-visits'], queryFn: async () => unwrap<UnbilledVisit[]>(await api.get('/billing/unbilled-visits')) });
export const useGenerateInvoice = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (input: { visitId: string; discount: number; tax: number }) => unwrap<InvoiceDetail>(await api.post(`/billing/visits/${input.visitId}/invoice`, { discount: input.discount, tax: input.tax })), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['billing'] }), client.invalidateQueries({ queryKey: ['billing', 'unbilled-visits'] })]); } }); };
export const useCreatePayment = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (input: { invoiceId: string; amount: number; method: string; reference?: string }) => unwrap(await api.post('/payments', input)), onSuccess: () => client.invalidateQueries({ queryKey: ['billing'] }) }); };
