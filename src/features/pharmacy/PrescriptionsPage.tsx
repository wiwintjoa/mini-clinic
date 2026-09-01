import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { DispensingModal } from './DispensingModal';
import { FileText, Eye, Pill, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { PrescriptionStatus } from '@/types';

const STATUS_COLORS: Record<PrescriptionStatus, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  SUBMITTED: 'bg-warning-100 text-warning-700 border-warning-200',
  PROCESSING: 'bg-accent-100 text-accent-700 border-accent-200',
  READY: 'bg-primary-100 text-primary-700 border-primary-200',
  DISPENSED: 'bg-success-100 text-success-700 border-success-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

interface PrescriptionRow {
  id: string;
  prescription_number: string;
  status: PrescriptionStatus;
  created_at: string;
  patient: { full_name: string; mrn: string } | null;
  doctor: { specialty: string; staff: { full_name: string } | null } | null;
  prescription_items: Array<{
    id: string;
    medicine_id: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string | null;
    medicine: { name: string; code: string } | null;
  }>;
}

export function PrescriptionsPage() {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<string>('SUBMITTED');
  const [detailRx, setDetailRx] = useState<PrescriptionRow | null>(null);
  const [dispenseId, setDispenseId] = useState<string | null>(null);

  const { data: prescriptions, isLoading, isError } = useQuery<PrescriptionRow[]>({
    queryKey: ['pharmacy-prescriptions', statusTab],
    queryFn: async () => {
      let q = supabase.from('prescriptions')
        .select('id, prescription_number, status, created_at, patient:patients(full_name, mrn), doctor:doctors(specialty, staff:staff(full_name)), prescription_items:prescription_items(id, medicine_id, dosage, frequency, duration, quantity, instructions, medicine:medicines(name, code))')
        .order('created_at', { ascending: false });
      if (statusTab !== 'ALL') q = q.eq('status', statusTab);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PrescriptionRow[];
    },
  });

  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prescriptions').update({ status: 'PROCESSING' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] }),
  });

  const tabs = ['SUBMITTED', 'PROCESSING', 'READY', 'DISPENSED', 'ALL'];

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Process and dispense prescriptions" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((s) => (
          <button key={s} onClick={() => setStatusTab(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusTab === s ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 border border-secondary-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load prescriptions" /> : !prescriptions || prescriptions.length === 0 ? (
        <EmptyState icon={FileText} title="No prescriptions" message="No prescriptions in this category." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Rx #</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-mono text-xs text-secondary-600">{rx.prescription_number}</td>
                  <td className="px-4 py-3 font-medium text-secondary-900">{rx.patient?.full_name ?? 'Unknown'}</td>
                  <td className="px-4 py-3 text-secondary-600">{rx.doctor?.staff?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-600">{format(new Date(rx.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-secondary-600">{rx.prescription_items?.length ?? 0}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[rx.status]}`}>{rx.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDetailRx(rx)} className="btn-ghost p-1.5" title="View"><Eye className="w-4 h-4" /></button>
                      {rx.status === 'SUBMITTED' && (
                        <button onClick={() => processMutation.mutate(rx.id)} className="btn-secondary text-xs" disabled={processMutation.isPending}>
                          {processMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Process'}
                        </button>
                      )}
                      {(rx.status === 'PROCESSING' || rx.status === 'READY') && (
                        <button onClick={() => setDispenseId(rx.id)} className="btn-primary text-xs">
                          <Pill className="w-3.5 h-3.5" /> Dispense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailRx && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailRx(null)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900">Prescription Detail</h2>
              <button onClick={() => setDetailRx(null)} className="text-secondary-400 hover:text-secondary-600">✕</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-mono text-xs text-secondary-500">{detailRx.prescription_number}</p>
                <p className="font-medium text-secondary-900">{detailRx.patient?.full_name}</p>
                <p className="text-secondary-500">{detailRx.doctor?.staff?.full_name ?? '—'} · {detailRx.doctor?.specialty ?? '—'}</p>
              </div>
              <div className="border-t border-secondary-100 pt-3">
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">Items</h4>
                {detailRx.prescription_items?.map((item) => (
                  <div key={item.id} className="border border-secondary-100 rounded-lg p-3 mb-2">
                    <p className="text-sm font-medium text-secondary-900">{item.medicine?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-secondary-500">{item.dosage} · {item.frequency} · {item.duration} · Qty: {item.quantity}</p>
                    {item.instructions && <p className="text-xs text-secondary-400 mt-1">{item.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {dispenseId && <DispensingModal prescriptionId={dispenseId} onClose={() => setDispenseId(null)} />}
    </div>
  );
}
