import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Receipt, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import type { InvoiceStatus } from '@/types';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: 'bg-warning-100 text-warning-700 border-warning-200',
  PAID: 'bg-success-100 text-success-700 border-success-200',
  PARTIAL: 'bg-accent-100 text-accent-700 border-accent-200',
  REFUNDED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function PatientInvoicesPage() {
  const { user } = useAuthStore();
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: patientId } = useQuery({
    queryKey: ['patient-self-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id').eq('auth_user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ['patient-invoices', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, grand_total, status')
        .eq('patient_id', patientId!)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; invoice_number: string; invoice_date: string; grand_total: number; status: InvoiceStatus }>;
    },
    enabled: !!patientId,
  });

  return (
    <div>
      <PageHeader title="My Invoices" subtitle="View and track your invoices" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load invoices" /> : !invoices || invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" message="Your invoice history will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-mono text-xs text-secondary-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-secondary-600">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-secondary-700">{formatRp(Number(inv.grand_total))}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetailId(inv.id)} className="btn-ghost p-1.5"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detailId && <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function InvoiceDetailModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patient-invoice-detail', invoiceId],
    queryFn: async () => {
      const [invRes, itemsRes, payRes] = await Promise.all([
        supabase.from('invoices').select('invoice_number, invoice_date, subtotal, discount, tax, grand_total, status').eq('id', invoiceId).maybeSingle(),
        supabase.from('invoice_items').select('description, quantity, unit_price, total').eq('invoice_id', invoiceId),
        supabase.from('payments').select('amount, method, created_at').eq('invoice_id', invoiceId).order('created_at', { ascending: false }),
      ]);
      if (invRes.error) throw invRes.error;
      return {
        invoice: invRes.data as { invoice_number: string; invoice_date: string; subtotal: number; discount: number; tax: number; grand_total: number; status: InvoiceStatus } | null,
        items: (itemsRes.data ?? []) as Array<{ description: string; quantity: number; unit_price: number; total: number }>,
        payments: (payRes.data ?? []) as Array<{ amount: number; method: string; created_at: string }>,
      };
    },
  });

  const totalPaid = data?.payments.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const outstanding = data?.invoice ? Number(data.invoice.grand_total) - totalPaid : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Invoice Detail</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        {isLoading ? <LoadingState /> : data?.invoice && (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-xs text-secondary-500">{data.invoice.invoice_number}</p>
              <p className="text-sm text-secondary-600">{format(new Date(data.invoice.invoice_date), 'MMM d, yyyy')}</p>
              <span className={`badge mt-1 ${STATUS_COLORS[data.invoice.status]}`}>{data.invoice.status}</span>
            </div>
            <div className="border-t border-secondary-100 pt-3">
              <table className="w-full text-sm">
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={i}><td className="py-1 text-secondary-700">{it.description}</td><td className="py-1 text-right text-secondary-700">{formatRp(Number(it.total))}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-secondary-100"><td className="pt-2 font-semibold">Total</td><td className="pt-2 text-right font-semibold">{formatRp(Number(data.invoice.grand_total))}</td></tr>
                </tfoot>
              </table>
            </div>
            {data.payments.length > 0 && (
              <div className="border-t border-secondary-100 pt-3">
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">Payments</h4>
                {data.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-secondary-600">{format(new Date(p.created_at), 'MMM d, yyyy')} · {p.method}</span>
                    <span className="text-secondary-900">{formatRp(Number(p.amount))}</span>
                  </div>
                ))}
                {outstanding > 0 && <p className="text-sm text-error-600 font-medium mt-2">Outstanding: {formatRp(outstanding)}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
