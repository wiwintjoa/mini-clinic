import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/types';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Plus, Pencil, X, Stethoscope } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be >= 0'),
  duration_minutes: z.coerce.number().int().min(1, 'Duration must be >= 1'),
  is_active: z.boolean(),
});
type FormValues = z.input<typeof schema>;
type CreateValues = Omit<FormValues, 'description'> & { description: string | null };

const formatRupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export function AdminServicesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; service?: Service } | null>(null);

  const { data: services, isLoading, isError } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw error;
      return data as Service[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (v: CreateValues) => {
      const { error } = await supabase.from('services').insert({ ...v, description: v.description ?? null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); setModal(null); },
  });

  const updateMutation = useMutation({
    mutationFn: async (v: CreateValues & { id: string }) => {
      const { id, ...rest } = v;
      const { error } = await supabase.from('services').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); setModal(null); },
  });

  return (
    <div>
      <PageHeader
        title="Services Management"
        subtitle="Manage clinic services and pricing"
        action={<button onClick={() => setModal({ mode: 'create' })} className="btn-primary"><Plus className="w-4 h-4 inline mr-1" />Add Service</button>}
      />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load services" />
      ) : !services || services.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No services" message="Add your first service to get started." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-secondary-900">{s.name}</div>
                    {s.description && <div className="text-xs text-secondary-500">{s.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-secondary-700">{formatRupiah(Number(s.price))}</td>
                  <td className="px-4 py-3 text-secondary-700">{s.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    <span className={`badge border ${s.is_active ? 'bg-success-100 text-success-700 border-success-200' : 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}>
                      {s.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal({ mode: 'edit', service: s })} className="btn-secondary !px-2 !py-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <ServiceModal
          mode={modal.mode}
          service={modal.service}
          onClose={() => setModal(null)}
          onCreate={(v) => createMutation.mutate(v)}
          onUpdate={(v) => updateMutation.mutate(v)}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ServiceModal({ mode, service, onClose, onCreate, onUpdate, submitting }: {
  mode: 'create' | 'edit';
  service?: Service;
  onClose: () => void;
  onCreate: (v: CreateValues) => void;
  onUpdate: (v: CreateValues & { id: string }) => void;
  submitting: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { name: service.name, description: service.description, price: service.price, duration_minutes: service.duration_minutes, is_active: service.is_active }
      : { name: '', description: '', price: 0, duration_minutes: 30, is_active: true },
  });

  const submit = (v: FormValues) => {
    const payload: CreateValues = { ...v, description: v.description ?? null };
    if (mode === 'edit' && service) onUpdate({ ...payload, id: service.id });
    else onCreate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">{mode === 'create' ? 'Add Service' : 'Edit Service'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-secondary-700">Name</label>
            <input className="input mt-1" {...register('name')} />
            {errors.name && <p className="text-xs text-error-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-700">Description</label>
            <textarea className="input mt-1" rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-secondary-700">Price (Rp)</label>
              <input type="number" className="input mt-1" {...register('price')} />
              {errors.price && <p className="text-xs text-error-600 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Duration (min)</label>
              <input type="number" className="input mt-1" {...register('duration_minutes')} />
              {errors.duration_minutes && <p className="text-xs text-error-600 mt-1">{errors.duration_minutes.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-secondary-700">
            <input type="checkbox" {...register('is_active')} /> Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
