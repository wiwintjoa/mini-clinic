import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface VisitRow {
  id: string;
  visit_date: string;
  status: string;
  chief_complaint: string | null;
  assessment: string | null;
  plan: string | null;
  treatment: string | null;
  doctor: { specialty: string; staff: { full_name: string } | null } | null;
  vital_signs: Array<{
    id: string; blood_pressure_systolic: number | null; blood_pressure_diastolic: number | null;
    heart_rate: number | null; temperature: number | null; spo2: number | null; weight: number | null; height: number | null;
  }>;
  visit_diagnoses: Array<{
    id: string; is_primary: boolean;
    diagnosis: { icd10_code: string; name: string };
  }>;
}

export function PatientHistoryPage() {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: patientId } = useQuery({
    queryKey: ['patient-self-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id').eq('auth_user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: visits, isLoading, isError } = useQuery<VisitRow[]>({
    queryKey: ['patient-history', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_date, status, chief_complaint, assessment, plan, treatment, doctor:doctors(specialty, staff:staff(full_name)), vital_signs:vital_signs(id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, spo2, weight, height), visit_diagnoses:visit_diagnoses(id, is_primary, diagnosis:diagnoses(icd10_code, name))')
        .eq('patient_id', patientId!)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VisitRow[];
    },
    enabled: !!patientId,
  });

  return (
    <div>
      <PageHeader title="Medical History" subtitle="View your visit history" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load history" /> : !visits || visits.length === 0 ? (
        <EmptyState icon={History} title="No visits" message="Your visit history will appear here." />
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="card overflow-hidden">
              <button onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="w-full flex items-center justify-between p-4 hover:bg-secondary-50">
                <div className="text-left">
                  <p className="text-sm font-medium text-secondary-900">{format(new Date(v.visit_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-secondary-500">{v.doctor?.staff?.full_name ?? 'Unknown'} · {v.doctor?.specialty ?? '—'}</p>
                  {v.chief_complaint && <p className="text-xs text-secondary-400 mt-0.5">CC: {v.chief_complaint}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-secondary-50 text-secondary-600 border-secondary-200">{v.status}</span>
                  {expanded === v.id ? <ChevronUp className="w-4 h-4 text-secondary-400" /> : <ChevronDown className="w-4 h-4 text-secondary-400" />}
                </div>
              </button>
              {expanded === v.id && (
                <div className="border-t border-secondary-100 p-4 space-y-3">
                  {v.vital_signs && v.vital_signs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-secondary-700 mb-1">Vital Signs</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {v.vital_signs[0].blood_pressure_systolic && <span>BP: {v.vital_signs[0].blood_pressure_systolic}/{v.vital_signs[0].blood_pressure_diastolic}</span>}
                        {v.vital_signs[0].heart_rate && <span>HR: {v.vital_signs[0].heart_rate} bpm</span>}
                        {v.vital_signs[0].temperature && <span>Temp: {v.vital_signs[0].temperature}°C</span>}
                        {v.vital_signs[0].spo2 && <span>SpO2: {v.vital_signs[0].spo2}%</span>}
                      </div>
                    </div>
                  )}
                  {v.visit_diagnoses && v.visit_diagnoses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-secondary-700 mb-1">Diagnoses</p>
                      <div className="flex flex-wrap gap-1">
                        {v.visit_diagnoses.map((vd) => (
                          <span key={vd.id} className="badge bg-primary-50 text-primary-700 border-primary-100">
                            {vd.diagnosis.icd10_code} · {vd.diagnosis.name}
                            {vd.is_primary && <span className="ml-1 text-primary-400">(Primary)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {v.assessment && <div><p className="text-xs font-semibold text-secondary-700 mb-1">Assessment</p><p className="text-sm text-secondary-600">{v.assessment}</p></div>}
                  {v.plan && <div><p className="text-xs font-semibold text-secondary-700 mb-1">Plan</p><p className="text-sm text-secondary-600">{v.plan}</p></div>}
                  {v.treatment && <div><p className="text-xs font-semibold text-secondary-700 mb-1">Treatment</p><p className="text-sm text-secondary-600">{v.treatment}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
