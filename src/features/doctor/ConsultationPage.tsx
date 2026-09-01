import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { PageHeader, LoadingState, ErrorState } from '@/components/common/States';
import { PatientSummary } from './PatientSummary';
import { VitalSignsSection } from './VitalSignsSection';
import { SoapNotesSection } from './SoapNotesSection';
import { Search, Plus, Trash2, FileText, Send, Stethoscope, Activity, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

interface ConsultationPageProps {
  visitId: string;
}

interface VisitData {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  chief_complaint: string | null;
  history_present_illness: string | null;
  physical_examination: string | null;
  clinical_findings: string | null;
  assessment: string | null;
  plan: string | null;
  treatment: string | null;
  follow_up: string | null;
  additional_notes: string | null;
}

interface DiagnosisRow {
  id: string;
  icd10_code: string;
  name: string;
  is_active: boolean;
}

interface VisitDiagnosisRow {
  id: string;
  visit_id: string;
  diagnosis_id: string;
  is_primary: boolean;
  notes: string | null;
  diagnosis: { icd10_code: string; name: string };
}

interface MedicineRow {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface PrescriptionItemRow {
  id: string;
  prescription_id: string;
  medicine_id: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  medicine: { name: string; code: string } | null;
}

interface PrescriptionRow {
  id: string;
  prescription_number: string;
  status: string;
  prescription_items: PrescriptionItemRow[];
}

const ROUTES = ['Oral', 'Topical', 'IV', 'IM', 'Subcutaneous', 'Inhalation', 'Rectal', 'Ophthalmic'];

export function ConsultationPage({ visitId }: ConsultationPageProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'vitals' | 'soap' | 'diagnosis' | 'prescription'>('summary');
  const qc = useQueryClient();

  const { data: visit, isLoading, isError } = useQuery<VisitData>({
    queryKey: ['visit-detail', visitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('visits').select('*').eq('id', visitId).maybeSingle();
      if (error) throw error;
      return data as VisitData;
    },
  });

  if (isLoading) return <LoadingState message="Loading consultation..." />;
  if (isError || !visit) return <ErrorState message="Failed to load visit" />;

  const tabs = [
    { key: 'summary' as const, label: 'Patient Summary', icon: Stethoscope },
    { key: 'vitals' as const, label: 'Vital Signs', icon: Activity },
    { key: 'soap' as const, label: 'SOAP Notes', icon: ClipboardList },
    { key: 'diagnosis' as const, label: 'Diagnosis', icon: FileText },
    { key: 'prescription' as const, label: 'Prescription', icon: Plus },
  ];

  return (
    <div>
      <PageHeader
        title="Consultation"
        subtitle={`Visit date: ${format(new Date(), 'MMM d, yyyy')} · Status: ${visit.status}`}
      />
      <div className="flex gap-1 mb-4 border-b border-secondary-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'summary' && <PatientSummary patientId={visit.patient_id} />}
      {activeTab === 'vitals' && <VitalSignsSection visitId={visitId} />}
      {activeTab === 'soap' && (
        <SoapNotesSection
          visitId={visitId}
          initialData={{
            chief_complaint: visit.chief_complaint ?? '',
            history_present_illness: visit.history_present_illness ?? '',
            physical_examination: visit.physical_examination ?? '',
            clinical_findings: visit.clinical_findings ?? '',
            assessment: visit.assessment ?? '',
            plan: visit.plan ?? '',
            treatment: visit.treatment ?? '',
            follow_up: visit.follow_up ?? '',
            additional_notes: visit.additional_notes ?? '',
          }}
        />
      )}
      {activeTab === 'diagnosis' && <DiagnosisSection visitId={visitId} />}
      {activeTab === 'prescription' && <PrescriptionSection visitId={visitId} patientId={visit.patient_id} doctorId={visit.doctor_id} />}
    </div>
  );
}

function DiagnosisSection({ visitId }: { visitId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<DiagnosisRow[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: visitDx, isLoading, isError } = useQuery<VisitDiagnosisRow[]>({
    queryKey: ['visit-diagnoses', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_diagnoses')
        .select('id, visit_id, diagnosis_id, is_primary, notes, diagnosis:diagnoses(icd10_code, name)')
        .eq('visit_id', visitId);
      if (error) throw error;
      return (data ?? []) as unknown as VisitDiagnosisRow[];
    },
  });

  const searchDiagnoses = async (term: string) => {
    setSearch(term);
    if (term.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data, error } = await supabase
      .from('diagnoses')
      .select('id, icd10_code, name, is_active')
      .eq('is_active', true)
      .or(`icd10_code.ilike.%${term}%,name.ilike.%${term}%`)
      .limit(10);
    if (!error) setResults((data ?? []) as DiagnosisRow[]);
    setSearching(false);
  };

  const addDiagnosis = useMutation({
    mutationFn: async (dx: DiagnosisRow) => {
      const existingPrimary = visitDx?.some((vd) => vd.is_primary);
      const { error } = await supabase.from('visit_diagnoses').insert({
        visit_id: visitId,
        diagnosis_id: dx.id,
        is_primary: !existingPrimary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit-diagnoses', visitId] });
      setSearch('');
      setResults([]);
    },
  });

  const removeDiagnosis = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('visit_diagnoses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visit-diagnoses', visitId] }),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('visit_diagnoses').update({ is_primary: false }).eq('visit_id', visitId);
      const { error } = await supabase.from('visit_diagnoses').update({ is_primary: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visit-diagnoses', visitId] }),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Failed to load diagnoses" />;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Search Diagnosis (ICD-10)</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => searchDiagnoses(e.target.value)}
            placeholder="Search by ICD-10 code or name..."
            className="input pl-10"
          />
        </div>
        {searching && <p className="text-xs text-secondary-400 mt-2">Searching...</p>}
        {results.length > 0 && (
          <div className="mt-2 space-y-1">
            {results.map((dx) => (
              <button
                key={dx.id}
                onClick={() => addDiagnosis.mutate(dx)}
                className="w-full text-left p-2 rounded-lg hover:bg-primary-50 border border-secondary-100 text-sm"
              >
                <span className="font-mono text-xs text-primary-600">{dx.icd10_code}</span>
                <span className="ml-2 text-secondary-900">{dx.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Visit Diagnoses</h3>
        {!visitDx || visitDx.length === 0 ? (
          <p className="text-sm text-secondary-500">No diagnoses added yet.</p>
        ) : (
          <div className="space-y-2">
            {visitDx.map((vd) => (
              <div key={vd.id} className="flex items-center justify-between p-3 border border-secondary-100 rounded-lg">
                <div>
                  <span className="font-mono text-xs text-primary-600">{vd.diagnosis.icd10_code}</span>
                  <span className="ml-2 text-sm text-secondary-900">{vd.diagnosis.name}</span>
                  {vd.is_primary && (
                    <span className="ml-2 badge bg-primary-100 text-primary-700 border-primary-200">Primary</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {!vd.is_primary && (
                    <button onClick={() => setPrimary.mutate(vd.id)} className="btn-ghost text-xs px-2 py-1">Set Primary</button>
                  )}
                  <button onClick={() => removeDiagnosis.mutate(vd.id)} className="btn-ghost text-error-600 p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PrescriptionItemForm {
  medicine_id: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  instructions: string;
}

function PrescriptionSection({ visitId, patientId, doctorId }: { visitId: string; patientId: string; doctorId: string }) {
  const qc = useQueryClient();
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedicineRow[]>([]);
  const [items, setItems] = useState<PrescriptionItemForm[]>([]);

  const { data: prescription, isLoading } = useQuery<PrescriptionRow | null>({
    queryKey: ['visit-prescription', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, status, prescription_items:prescription_items(id, prescription_id, medicine_id, dosage, frequency, route, duration, quantity, instructions, medicine:medicines(name, code))')
        .eq('visit_id', visitId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PrescriptionRow | null;
    },
  });

  const searchMeds = async (term: string) => {
    setMedSearch(term);
    if (term.trim().length < 2) { setMedResults([]); return; }
    const { data, error } = await supabase
      .from('medicines')
      .select('id, code, name, unit')
      .eq('is_active', true)
      .or(`code.ilike.%${term}%,name.ilike.%${term}%,generic_name.ilike.%${term}%`)
      .limit(10);
    if (!error) setMedResults((data ?? []) as MedicineRow[]);
  };

  const addItem = (med: MedicineRow) => {
    setItems((prev) => [...prev, {
      medicine_id: med.id,
      dosage: '',
      frequency: '',
      route: 'Oral',
      duration: '',
      quantity: 1,
      instructions: '',
    }]);
    setMedSearch('');
    setMedResults([]);
  };

  const updateItem = (index: number, field: keyof PrescriptionItemForm, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const savePrescription = useMutation({
    mutationFn: async (status: 'DRAFT' | 'SUBMITTED') => {
      if (items.length === 0) throw new Error('Add at least one medicine');

      if (prescription) {
        const { error: updateErr } = await supabase.from('prescriptions').update({ status }).eq('id', prescription.id);
        if (updateErr) throw updateErr;
        for (const item of items) {
          const { error } = await supabase.from('prescription_items').insert({
            prescription_id: prescription.id,
            ...item,
          });
          if (error) throw error;
        }
      } else {
        const { data: rxNum } = await supabase.rpc('generate_prescription_number');
        const { data: newRx, error: rxErr } = await supabase.from('prescriptions').insert({
          prescription_number: rxNum,
          patient_id: patientId,
          doctor_id: doctorId,
          visit_id: visitId,
          status,
        }).select('id').single();
        if (rxErr) throw rxErr;

        for (const item of items) {
          const { error } = await supabase.from('prescription_items').insert({
            prescription_id: (newRx as { id: string }).id,
            ...item,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit-prescription', visitId] });
      setItems([]);
    },
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {prescription && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary-900">{prescription.prescription_number}</p>
              <span className={`badge mt-1 ${prescription.status === 'SUBMITTED' ? 'bg-accent-100 text-accent-700 border-accent-200' : 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}>
                {prescription.status}
              </span>
            </div>
          </div>
          {prescription.prescription_items && prescription.prescription_items.length > 0 && (
            <div className="mt-3 space-y-1">
              {prescription.prescription_items.map((item) => (
                <div key={item.id} className="text-sm text-secondary-700 border border-secondary-100 rounded-lg p-2">
                  <span className="font-medium">{item.medicine?.name ?? 'Unknown'}</span>
                  <span className="text-secondary-500 ml-2">{item.dosage} · {item.frequency} · {item.duration}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Add Medicines</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={medSearch}
            onChange={(e) => searchMeds(e.target.value)}
            placeholder="Search medicine by code, name, or generic name..."
            className="input pl-10"
          />
        </div>
        {medResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {medResults.map((med) => (
              <button
                key={med.id}
                onClick={() => addItem(med)}
                className="w-full text-left p-2 rounded-lg hover:bg-primary-50 border border-secondary-100 text-sm"
              >
                <span className="font-mono text-xs text-primary-600">{med.code}</span>
                <span className="ml-2 text-secondary-900">{med.name}</span>
                <span className="text-xs text-secondary-400 ml-2">({med.unit})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-secondary-900 mb-3">Prescription Items</h3>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="border border-secondary-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary-900">Item {i + 1}</span>
                  <button onClick={() => removeItem(i)} className="text-error-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-secondary-500">Dosage</label>
                    <input className="input" value={item.dosage} onChange={(e) => updateItem(i, 'dosage', e.target.value)} placeholder="500mg" />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500">Frequency</label>
                    <input className="input" value={item.frequency} onChange={(e) => updateItem(i, 'frequency', e.target.value)} placeholder="3 times daily" />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500">Route</label>
                    <select className="input" value={item.route} onChange={(e) => updateItem(i, 'route', e.target.value)}>
                      {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500">Duration</label>
                    <input className="input" value={item.duration} onChange={(e) => updateItem(i, 'duration', e.target.value)} placeholder="5 days" />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500">Quantity</label>
                    <input type="number" className="input" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="text-xs text-secondary-500">Instructions</label>
                    <input className="input" value={item.instructions} onChange={(e) => updateItem(i, 'instructions', e.target.value)} placeholder="Take after meals" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => savePrescription.mutate('DRAFT')} className="btn-secondary" disabled={savePrescription.isPending}>
              Save as Draft
            </button>
            <button onClick={() => savePrescription.mutate('SUBMITTED')} className="btn-primary" disabled={savePrescription.isPending}>
              <Send className="w-4 h-4" />
              {savePrescription.isPending ? 'Submitting...' : 'Submit to Pharmacy'}
            </button>
          </div>
          {savePrescription.isError && (
            <p className="text-sm text-error-600 mt-2">Error: {(savePrescription.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  );
}
