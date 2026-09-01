import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoadingState, ErrorState } from '@/components/common/States';
import { Patient, Visit } from '@/types';
import { differenceInYears, format } from 'date-fns';
import { Droplet, ClipboardList } from 'lucide-react';

interface PatientSummaryProps {
  patientId: string;
}

interface PreviousVisit {
  id: string;
  visit_date: string;
  status: string;
  chief_complaint: string | null;
  assessment: string | null;
  doctor?: { specialty: string; staff?: { full_name: string } | null } | null;
  visit_diagnoses?: { diagnosis: { icd10_code: string; name: string } }[];
}

export function PatientSummary({ patientId }: PatientSummaryProps) {
  const { data: patient, isLoading: pLoading, isError: pError } = useQuery<Patient>({
    queryKey: ['patient-summary', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();
      if (error) throw error;
      return data as Patient;
    },
  });

  const { data: previousVisits, isLoading: vLoading, isError: vError } = useQuery<PreviousVisit[]>({
    queryKey: ['patient-previous-visits', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, visit_date, status, chief_complaint, assessment,
          doctor:doctors(specialty, staff:staff(full_name)),
          visit_diagnoses:visit_diagnoses(diagnosis:diagnoses(icd10_code, name))
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as PreviousVisit[];
    },
  });

  if (pLoading || vLoading) return <LoadingState message="Loading patient info..." />;
  if (pError || vError) return <ErrorState message="Failed to load patient information." />;
  if (!patient) return null;

  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Patient Information</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-secondary-500">Name</dt>
            <dd className="font-medium text-secondary-900">{patient.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary-500">MRN</dt>
            <dd className="font-medium text-secondary-900">{patient.mrn}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary-500">Age / Gender</dt>
            <dd className="font-medium text-secondary-900">
              {age !== null ? `${age}y` : '--'} {patient.gender ? `· ${patient.gender}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-secondary-500">Date of Birth</dt>
            <dd className="font-medium text-secondary-900">
              {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : '--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-secondary-500">Phone</dt>
            <dd className="font-medium text-secondary-900">{patient.phone ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary-500">Blood Type</dt>
            <dd className="font-medium text-secondary-900 inline-flex items-center gap-1">
              {patient.blood_type ? (
                <>
                  <Droplet className="w-3.5 h-3.5 text-error-500" />
                  {patient.blood_type}
                </>
              ) : '--'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3 inline-flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Previous Visits
        </h3>
        {!previousVisits || previousVisits.length === 0 ? (
          <p className="text-sm text-secondary-500">No previous visits on record.</p>
        ) : (
          <ul className="space-y-2">
            {previousVisits.map((v) => (
              <li key={v.id} className="border border-secondary-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary-900">
                    {format(new Date(v.visit_date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-secondary-500">
                    {v.doctor?.staff?.full_name ?? 'Unknown doctor'}
                  </span>
                </div>
                {v.chief_complaint && (
                  <p className="text-xs text-secondary-600 mt-1">CC: {v.chief_complaint}</p>
                )}
                {v.visit_diagnoses && v.visit_diagnoses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.visit_diagnoses.map((vd, i) => (
                      <span key={i} className="badge bg-primary-50 text-primary-700 border-primary-100">
                        {vd.diagnosis.icd10_code} · {vd.diagnosis.name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
