import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Staff, RoleName } from '@/types';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Users } from 'lucide-react';

const ROLES: RoleName[] = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'PATIENT'];

export function AdminStaffPage() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<'ALL' | RoleName>('ALL');

  const { data: staff, isLoading, isError } = useQuery<Staff[]>({
    queryKey: ['admin-staff', roleFilter],
    queryFn: async () => {
      let q = supabase.from('staff').select('*, role:roles(*)').order('full_name');
      if (roleFilter !== 'ALL') {
        const { data: role } = await supabase.from('roles').select('id').eq('name', roleFilter).single();
        if (role) q = q.eq('role_id', role.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Staff[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (vars: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: vars.is_active, updated_at: new Date().toISOString() })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-staff'] }),
  });

  return (
    <div>
      <PageHeader title="Staff Management" subtitle="View and manage all staff members" />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setRoleFilter('ALL')}
          className={`badge border ${roleFilter === 'ALL' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white text-secondary-600 border-secondary-200'}`}
        >
          All
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`badge border ${roleFilter === r ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white text-secondary-600 border-secondary-200'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load staff" />
      ) : !staff || staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff" message="No staff members found for this filter." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-medium text-secondary-900">{s.full_name}</td>
                  <td className="px-4 py-3 text-secondary-700">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-accent-50 text-accent-700 border border-accent-200">{s.role?.name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-secondary-700">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
                      className={`badge border ${s.is_active ? 'bg-success-100 text-success-700 border-success-200' : 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
