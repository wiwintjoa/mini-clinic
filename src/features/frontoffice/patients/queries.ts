import { supabase } from '@/lib/supabase';
import type { Patient, Visit } from '@/types';

export const PAGE_SIZE = 10;

export interface PatientListResult {
  patients: Patient[];
  total: number;
}

export async function fetchPatients(params: {
  search: string;
  page: number;
}): Promise<PatientListResult> {
  const { search, page } = params;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    const s = search.trim();
    query = query.or(
      `mrn.ilike.%${s}%,full_name.ilike.%${s}%,nik.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    patients: (data ?? []) as Patient[],
    total: count ?? 0,
  };
}

export async function createPatient(
  values: Record<string, unknown>,
): Promise<Patient> {
  // Generate MRN via RPC
  const { data: mrn, error: mrnError } = await supabase.rpc('generate_mrn');
  if (mrnError) throw mrnError;

  const insertPayload = {
    ...values,
    mrn,
    status: 'ACTIVE' as const,
  };

  const { data, error } = await supabase
    .from('patients')
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data as Patient;
}

export async function fetchPatientDetail(id: string): Promise<{
  patient: Patient;
  visits: Visit[];
}> {
  const [patientRes, visitsRes] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('visits')
      .select('*, doctor:doctors(*, staff:staff(*))')
      .eq('patient_id', id)
      .order('visit_date', { ascending: false }),
  ]);

  if (patientRes.error) throw patientRes.error;
  if (visitsRes.error) throw visitsRes.error;

  return {
    patient: patientRes.data as Patient,
    visits: (visitsRes.data ?? []) as Visit[],
  };
}
