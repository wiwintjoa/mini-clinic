import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Receipt, Plus, X, CreditCard, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: 'bg-warning-100 text-warning-700 border-warning-200',
  PAID: 'bg-success-100 text-success-700 border-success-200',
  PARTIAL: 'bg-accent-100 text-accent-700 border-accent-200',
  REFUNDED: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'QRIS', 'INSURANCE'];

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function BillingPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const { data: invoices, isLoading, isError } = useQuery<Invoice[]>({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      let q = supabase.from('invoices').select('*, patient:patients(full_name, mrn)').order('created_at', { ascending: false });
      if (statusFilter !== 'ALL') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Invoice[];
    },
  });

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Create invoices and process payments"
        action={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        {['ALL', 'PENDING', 'PARTIAL', 'PAID'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 border border-secondary-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load invoices" /> : !invoices || invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" message="Create an invoice to get started." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {invoices.map((inv) => {
                const patientName = (inv as unknown as { patient?: { full_name?: string } }).patient?.full_name ?? 'Unknown';
                return (
                  <tr key={inv.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-mono text-xs text-secondary-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-secondary-900">{patientName}</td>
                    <td className="px-4 py-3 text-secondary-600">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-secondary-700">{formatRp(Number(inv.grand_total))}</td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setDetailId(inv.id)} className="btn-ghost p-1.5" title="View"><Eye className="w-4 h-4" /></button>
                        {(inv.status === 'PENDING' || inv.status === 'PARTIAL') && (
                          <button onClick={() => setPayId(inv.id)} className="btn-primary text-xs" title="Payment">
                            <CreditCard className="w-4 h-4" /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <CreateInvoiceModal onClose={() => setCreateOpen(false)} />}
      {detailId && <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />}
      {payId && <PaymentModal invoiceId={payId} onClose={() => setPayId(null)} />}
    </div>
  );
}

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState<Array<{ item_type: string; description: string; quantity: number; unit_price: number }>>([]);
  const [error, setError] = useState('');

  const { data: patients } = useQuery({
    queryKey: ['patients-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id, mrn, full_name').eq('status', 'ACTIVE').order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = () => setItems((prev) => [...prev, { item_type: 'SERVICE', description: '', quantity: 1, unit_price: 0 }]);
  const updateItem = (i: number, field: string, value: string | number) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Select a patient');
      if (items.length === 0) throw new Error('Add at least one item');
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const { data: inv, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: invNum,
        patient_id: patientId,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        subtotal,
        discount: 0,
        tax: 0,
        grand_total: subtotal,
        status: 'PENDING',
      }).select('id').single();
      if (invErr) throw invErr;
      for (const it of items) {
        const { error } = await supabase.from('invoice_items').insert({
          invoice_id: (inv as { id: string }).id,
          item_type: it.item_type,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.quantity * it.unit_price,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onClose(); },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">New Invoice</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        {error && <div className="mb-3 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary-700">Patient</label>
            <select className="input mt-1" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select patient...</option>
              {patients?.map((p) => <option key={p.id} value={p.id}>{p.mrn} — {p.full_name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-700">Line Items</label>
              <button onClick={addItem} className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="border border-secondary-200 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex justify-between">
                  <select className="input text-xs" value={it.item_type} onChange={(e) => updateItem(i, 'item_type', e.target.value)}>
                    <option value="CONSULTATION">Consultation</option>
                    <option value="MEDICINE">Medicine</option>
                    <option value="SERVICE">Service</option>
                  </select>
                  <button onClick={() => removeItem(i)} className="text-error-600 p-1"><X className="w-4 h-4" /></button>
                </div>
                <input className="input text-sm" placeholder="Description" value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="input text-sm" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                  <input type="number" className="input text-sm" placeholder="Price" value={it.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} />
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-semibold text-secondary-900 mt-2">Subtotal: {formatRp(subtotal)}</div>
          </div>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary w-full">
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: async () => {
      const [invRes, itemsRes, payRes] = await Promise.all([
        supabase.from('invoices').select('*, patient:patients(full_name, mrn)').eq('id', invoiceId).maybeSingle(),
        supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId),
        supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false }),
      ]);
      if (invRes.error) throw invRes.error;
      return { invoice: invRes.data, items: itemsRes.data ?? [], payments: payRes.data ?? [] };
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Invoice Detail</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        {isLoading ? <LoadingState /> : data?.invoice && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-mono text-xs text-secondary-500">{(data.invoice as { invoice_number: string }).invoice_number}</p>
                <p className="font-medium text-secondary-900">{(data.invoice as { patient?: { full_name?: string } }).patient?.full_name}</p>
              </div>
              <span className={`badge ${STATUS_COLORS[(data.invoice as { status: InvoiceStatus }).status]}`}>{(data.invoice as { status: string }).status}</span>
            </div>
            <div className="border-t border-secondary-100 pt-3">
              <table className="w-full text-sm">
                <thead className="text-secondary-500 text-left"><tr><th className="py-1">Description</th><th className="py-1 text-right">Amount</th></tr></thead>
                <tbody>
                  {data.items.map((it: { id: string; description: string; total: number }) => (
                    <tr key={it.id}><td className="py-1 text-secondary-700">{it.description}</td><td className="py-1 text-right text-secondary-700">{formatRp(Number(it.total))}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-secondary-100"><td className="pt-2 font-semibold">Total</td><td className="pt-2 text-right font-semibold">{formatRp(Number((data.invoice as { grand_total: number }).grand_total))}</td></tr></tfoot>
              </table>
            </div>
            {data.payments.length > 0 && (
              <div className="border-t border-secondary-100 pt-3">
                <h4 className="text-sm font-semibold text-secondary-900 mb-2">Payments</h4>
                {data.payments.map((p: { id: string; amount: number; method: string; created_at: string }) => (
                  <div key={p.id} className="flex justify-between text-sm py-1">
                    <span className="text-secondary-600">{format(new Date(p.created_at), 'MMM d, yyyy')} · {p.method}</span>
                    <span className="text-secondary-900">{formatRp(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const { data: invoice } = useQuery({
    queryKey: ['invoice-pay', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('grand_total, status').eq('id', invoiceId).maybeSingle();
      if (error) throw error;
      return data as { grand_total: number; status: string } | null;
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      const { error } = await supabase.from('payments').insert({
        invoice_id: invoiceId,
        amount: amt,
        method,
        status: 'PAID',
        reference: reference || null,
      });
      if (error) throw error;
      const total = Number(invoice?.grand_total ?? 0);
      const newStatus = amt >= total ? 'PAID' : 'PARTIAL';
      await supabase.from('invoices').update({ status: newStatus }).eq('id', invoiceId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] }); onClose(); },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Record Payment</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        {error && <div className="mb-3 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}
        {invoice && <p className="text-sm text-secondary-500 mb-3">Total: {formatRp(Number(invoice.grand_total))}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-secondary-700">Amount</label>
            <input type="number" className="input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-700">Method</label>
            <select className="input mt-1" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-700">Reference (optional)</label>
            <input className="input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref" />
          </div>
          <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="btn-primary w-full">
            {payMutation.isPending ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
