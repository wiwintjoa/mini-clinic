import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../app/api/client';
export type AuditRecord = { id: string; userId: string | null; action: string; entity: string; entityId: string | null; ipAddress: string | null; createdAt: string };
export const useAuditLogs = (page: number, search: string) => useQuery({ queryKey: ['audit', page, search], queryFn: async () => (await api.get<{ data: AuditRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } }>('/audit', { params: { page, limit: 20, search: search || undefined } })).data, placeholderData: keepPreviousData });
