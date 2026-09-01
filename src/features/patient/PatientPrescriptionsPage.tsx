import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { FileText } from 'lucide-react';
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

export function PatientPrescriptionsPage() {
  const { user } = useAuthStore();

  const { data: patientId } = useQuery({
    queryKey: ['patient-self-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id').eq('auth_user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: prescriptions, isLoading, isError } = useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, status, created_at, doctor:doctors(specialty, staff:staff(full_name)), prescription_items:prescription_items(id, dosage, frequency, duration, quantity, instructions, medicine:medicines(name, code))')
        .eq('patient_id', patientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; prescription_number: string; status: PrescriptionStatus; created_at: string;
        doctor: { specialty: string; staff: { full_name: string } | null } | null;
        prescription_items: Array<{
          id: string; dosage: string; frequency: string; duration: string; quantity: number; instructions: string | null;
          medicine: { name: string; code: string } | null;
        }>;
      }>;
    },
    enabled: !!patientId,
  });

  return (
    <div>
      <PageHeader title="My Prescriptions" subtitle="View your prescription history" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load prescriptions" /> : !prescriptions || prescriptions.length === 0 ? (
        <EmptyState icon={FileText} title="No prescriptions" message="Your prescription history will appear here." />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-secondary-500">{rx.prescription_number}</p>
                  <p className="text-sm font-medium text-secondary-900">{rx.doctor?.staff?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-secondary-500">{format(new Date(rx.created_at), 'MMM d, yyyy')}</p>
                </div>
                <span className={`badge ${STATUS_COLORS[rx.status]}`}>{rx.status}</span>
              </div>
              {rx.prescription_items && rx.prescription_items.length > 0 && (
                <div className="border-t border-secondary-100 pt-2 mt-2 space-y-1">
                  {rx.prescription_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium text-secondary-900">{item.medicine?.name ?? 'Unknown'}</span>
                        <span className="text-secondary-500 ml-2 text-xs">{item.dosage} · {item.frequency} · {item.duration}</span>
                      </div>
                      <span className="text-secondary-500 text-xs">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
