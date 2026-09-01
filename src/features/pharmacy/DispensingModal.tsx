import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { X, AlertCircle, CheckCircle2, Loader2, Pill } from 'lucide-react';
import { format } from 'date-fns';

interface DispensingModalProps {
  prescriptionId: string;
  onClose: () => void;
}

interface PrescriptionItemRow {
  id: string;
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  medicine: { name: string; code: string } | null;
}

interface BatchRow {
  id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
}

export function DispensingModal({ prescriptionId, onClose }: DispensingModalProps) {
  const qc = useQueryClient();
  const { staff } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: rx, isLoading } = useQuery({
    queryKey: ['dispense-rx', prescriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, patient:patients(full_name, mrn), prescription_items:prescription_items(id, medicine_id, dosage, frequency, duration, quantity, instructions, medicine:medicines(name, code))')
        .eq('id', prescriptionId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        prescription_number: string;
        patient: { full_name: string; mrn: string } | null;
        prescription_items: PrescriptionItemRow[];
      } | null;
    },
  });

  const { data: stockMap, isLoading: stockLoading } = useQuery({
    queryKey: ['dispense-stock', prescriptionId],
    queryFn: async () => {
      if (!rx) return {};
      const map: Record<string, { totalStock: number; batches: BatchRow[] }> = {};
      for (const item of rx.prescription_items) {
        const { data: batches } = await supabase
          .from('medicine_batches')
          .select('id, batch_number, expiry_date, quantity')
          .eq('medicine_id', item.medicine_id)
          .gt('expiry_date', format(new Date(), 'yyyy-MM-dd'))
          .gt('quantity', 0)
          .order('expiry_date', { ascending: true });
        const batchesTyped = (batches ?? []) as BatchRow[];
        map[item.id] = {
          totalStock: batchesTyped.reduce((sum, b) => sum + b.quantity, 0),
          batches: batchesTyped,
        };
      }
      return map;
    },
    enabled: !!rx,
  });

  const dispenseMutation = useMutation({
    mutationFn: async () => {
      if (!rx) throw new Error('No prescription loaded');
      const stock = stockMap ?? {};

      for (const item of rx.prescription_items) {
        const info = stock[item.id];
        if (!info || info.totalStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.medicine?.name ?? 'medicine'}. Available: ${info?.totalStock ?? 0}, needed: ${item.quantity}`);
        }
      }

      for (const item of rx.prescription_items) {
        const info = stock[item.id];
        let remaining = item.quantity;
        for (const batch of info.batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.quantity, remaining);
          const newQty = batch.quantity - deduct;
          const { error: updateErr } = await supabase.from('medicine_batches').update({ quantity: newQty }).eq('id', batch.id);
          if (updateErr) throw updateErr;

          const { error: txErr } = await supabase.from('stock_transactions').insert({
            medicine_id: item.medicine_id,
            batch_id: batch.id,
            type: 'DISPENSE',
            quantity: -deduct,
            reference: rx.prescription_number,
            created_by: staff?.id ?? null,
          });
          if (txErr) throw txErr;

          const { error: itemErr } = await supabase.from('prescription_items')
            .update({ dispensed_quantity: deduct, batch_id: batch.id })
            .eq('id', item.id);
          if (itemErr) throw itemErr;

          remaining -= deduct;
        }
      }

      const { error: rxErr } = await supabase.from('prescriptions').update({ status: 'DISPENSED' }).eq('id', prescriptionId);
      if (rxErr) throw rxErr;
    },
    onSuccess: () => {
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ['pharmacy-prescriptions'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-inventory'] });
      setTimeout(() => onClose(), 1500);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to dispense'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-secondary-900">Dispense Prescription</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>

        {isLoading || stockLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto" /> : success ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-success-500 mb-2" />
            <p className="text-sm font-medium text-secondary-900">Prescription dispensed successfully!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
              </div>
            )}
            {rx && (
              <>
                <div className="text-sm">
                  <p className="font-mono text-xs text-secondary-500">{rx.prescription_number}</p>
                  <p className="font-medium text-secondary-900">{rx.patient?.full_name}</p>
                  <p className="text-secondary-500">{rx.patient?.mrn}</p>
                </div>
                <div className="border-t border-secondary-100 pt-3 space-y-2">
                  {rx.prescription_items.map((item) => {
                    const info = stockMap?.[item.id];
                    const sufficient = info && info.totalStock >= item.quantity;
                    return (
                      <div key={item.id} className="border border-secondary-100 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-secondary-900">{item.medicine?.name ?? 'Unknown'}</p>
                            <p className="text-xs text-secondary-500">{item.dosage} · {item.frequency} · {item.duration}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-secondary-900">Qty: {item.quantity}</p>
                            <p className={`text-xs ${sufficient ? 'text-success-600' : 'text-error-600'}`}>
                              Stock: {info?.totalStock ?? 0}
                            </p>
                          </div>
                        </div>
                        {!sufficient && <p className="text-xs text-error-600 mt-1">Insufficient stock!</p>}
                        {info && info.batches.length > 0 && (
                          <p className="text-xs text-secondary-400 mt-1">FEFO batch: {info.batches[0].batch_number} (exp: {format(new Date(info.batches[0].expiry_date), 'MMM yyyy')})</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => dispenseMutation.mutate()} disabled={dispenseMutation.isPending} className="btn-primary w-full">
                  {dispenseMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Dispensing...</> : 'Confirm Dispense (FEFO)'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
