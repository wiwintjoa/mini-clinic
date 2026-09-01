import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Package, Plus, X, Search, AlertTriangle, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

interface MedicineRow {
  id: string;
  code: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  total_stock: number;
}

const medSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  generic_name: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, 'Unit required'),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  minimum_stock: z.coerce.number().int().min(0),
  is_active: z.boolean().default(true),
});
type MedFormValues = z.input<typeof medSchema>;

const batchSchema = z.object({
  batch_number: z.string().min(1, 'Batch number required'),
  expiry_date: z.string().min(1, 'Expiry date required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be >= 1'),
  purchase_price: z.coerce.number().min(0),
});
type BatchFormValues = z.input<typeof batchSchema>;

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [medModal, setMedModal] = useState(false);
  const [batchModal, setBatchModal] = useState<string | null>(null);

  const { data: medicines, isLoading, isError } = useQuery<MedicineRow[]>({
    queryKey: ['pharmacy-inventory', search],
    queryFn: async () => {
      let q = supabase.from('medicines').select('*').eq('is_active', true).order('name');
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`code.ilike.%${s}%,name.ilike.%${s}%,generic_name.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const meds = (data ?? []) as Omit<MedicineRow, 'total_stock'>[];

      const result: MedicineRow[] = [];
      for (const m of meds) {
        const { data: batches } = await supabase
          .from('medicine_batches')
          .select('quantity, expiry_date')
          .eq('medicine_id', m.id)
          .gt('expiry_date', format(new Date(), 'yyyy-MM-dd'));
        const total = (batches ?? []).reduce((sum, b) => sum + b.quantity, 0);
        result.push({ ...m, total_stock: total });
      }
      return result;
    },
  });

  const lowStock = medicines?.filter((m) => m.total_stock < m.minimum_stock) ?? [];
  const expiringSoon = medicines?.filter((m) => {
    return m.total_stock > 0;
  }) ?? [];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Manage medicine inventory and stock"
        action={<button onClick={() => setMedModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Medicine</button>}
      />

      {lowStock.length > 0 && (
        <div className="card p-3 mb-4 flex items-center gap-2 bg-warning-50 border-warning-200">
          <AlertTriangle className="w-4 h-4 text-warning-600" />
          <p className="text-sm text-warning-700">{lowStock.length} medicine(s) below minimum stock.</p>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, name, or generic name..." className="input pl-10" />
        </div>
      </div>

      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load inventory" /> : !medicines || medicines.length === 0 ? (
        <EmptyState icon={Package} title="No medicines" message="Add your first medicine to get started." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 text-secondary-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Min Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {medicines.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-mono text-xs text-secondary-600">{m.code}</td>
                    <td className="px-4 py-3 font-medium text-secondary-900">{m.name}</td>
                    <td className="px-4 py-3 text-secondary-600">{m.category ?? '—'}</td>
                    <td className="px-4 py-3 text-secondary-600">{m.unit}</td>
                    <td className="px-4 py-3 text-secondary-700">{formatRp(Number(m.selling_price))}</td>
                    <td className="px-4 py-3">
                      <span className={m.total_stock < m.minimum_stock ? 'text-error-600 font-medium' : 'text-secondary-700'}>{m.total_stock}</span>
                    </td>
                    <td className="px-4 py-3 text-secondary-500">{m.minimum_stock}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setBatchModal(m.id)} className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add Stock</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {medModal && <AddMedicineModal onClose={() => setMedModal(false)} />}
      {batchModal && <AddBatchModal medicineId={batchModal} onClose={() => setBatchModal(null)} />}
    </div>
  );
}

function AddMedicineModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(medSchema) });

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const payload = { ...v };
      for (const [k, val] of Object.entries(payload)) {
        if (val === '') payload[k] = null;
      }
      const { error } = await supabase.from('medicines').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pharmacy-inventory'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Add Medicine</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v as Record<string, unknown>))} className="space-y-3">
          <div><label className="text-sm font-medium text-secondary-700">Code</label><input className="input mt-1" {...register('code')} />{errors.code && <p className="text-xs text-error-600 mt-1">{(errors.code as { message?: string }).message}</p>}</div>
          <div><label className="text-sm font-medium text-secondary-700">Name</label><input className="input mt-1" {...register('name')} />{errors.name && <p className="text-xs text-error-600 mt-1">{(errors.name as { message?: string }).message}</p>}</div>
          <div><label className="text-sm font-medium text-secondary-700">Generic Name</label><input className="input mt-1" {...register('generic_name')} /></div>
          <div><label className="text-sm font-medium text-secondary-700">Category</label><input className="input mt-1" {...register('category')} /></div>
          <div><label className="text-sm font-medium text-secondary-700">Unit</label><input className="input mt-1" {...register('unit')} placeholder="tablet, bottle, etc." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-secondary-700">Purchase Price</label><input type="number" className="input mt-1" {...register('purchase_price')} /></div>
            <div><label className="text-sm font-medium text-secondary-700">Selling Price</label><input type="number" className="input mt-1" {...register('selling_price')} /></div>
          </div>
          <div><label className="text-sm font-medium text-secondary-700">Minimum Stock</label><input type="number" className="input mt-1" {...register('minimum_stock')} /></div>
          <label className="flex items-center gap-2 text-sm text-secondary-700"><input type="checkbox" {...register('is_active')} /> Active</label>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">{mutation.isPending ? 'Saving...' : 'Add Medicine'}</button>
        </form>
      </div>
    </div>
  );
}

function AddBatchModal({ medicineId, onClose }: { medicineId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(batchSchema) });

  const mutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const { data: batch, error: bErr } = await supabase.from('medicine_batches').insert({ ...v, medicine_id: medicineId }).select('id').single();
      if (bErr) throw bErr;
      const { error: tErr } = await supabase.from('stock_transactions').insert({
        medicine_id: medicineId,
        batch_id: (batch as { id: string }).id,
        type: 'PURCHASE',
        quantity: v.quantity,
        reference: 'Manual stock addition',
      });
      if (tErr) throw tErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pharmacy-inventory'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Add Stock Batch</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v as Record<string, unknown>))} className="space-y-3">
          <div><label className="text-sm font-medium text-secondary-700">Batch Number</label><input className="input mt-1" {...register('batch_number')} /></div>
          <div><label className="text-sm font-medium text-secondary-700">Expiry Date</label><input type="date" className="input mt-1" {...register('expiry_date')} /></div>
          <div><label className="text-sm font-medium text-secondary-700">Quantity</label><input type="number" className="input mt-1" {...register('quantity')} /></div>
          <div><label className="text-sm font-medium text-secondary-700">Purchase Price</label><input type="number" className="input mt-1" {...register('purchase_price')} /></div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">{mutation.isPending ? 'Adding...' : 'Add Batch'}</button>
        </form>
      </div>
    </div>
  );
}
