import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { VitalSigns } from '@/types';
import { Activity, Save } from 'lucide-react';

interface VitalSignsSectionProps {
  visitId: string;
}

export function VitalSignsSection({ visitId }: VitalSignsSectionProps) {
  const queryClient = useQueryClient();
  const [savedMsg, setSavedMsg] = useState('');

  const { data: existing, isLoading } = useQuery<VitalSigns | null>({
    queryKey: ['visit-vitals', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VitalSigns | null;
    },
  });

  const [form, setForm] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    temperature: '',
    spo2: '',
    weight: '',
    height: '',
  });

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (existing && !synced) {
      setForm({
        blood_pressure_systolic: existing.blood_pressure_systolic?.toString() ?? '',
        blood_pressure_diastolic: existing.blood_pressure_diastolic?.toString() ?? '',
        heart_rate: existing.heart_rate?.toString() ?? '',
        respiratory_rate: existing.respiratory_rate?.toString() ?? '',
        temperature: existing.temperature?.toString() ?? '',
        spo2: existing.spo2?.toString() ?? '',
        weight: existing.weight?.toString() ?? '',
        height: existing.height?.toString() ?? '',
      });
      setSynced(true);
    }
  }, [existing, synced]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        visit_id: visitId,
        blood_pressure_systolic: values.blood_pressure_systolic ? Number(values.blood_pressure_systolic) : null,
        blood_pressure_diastolic: values.blood_pressure_diastolic ? Number(values.blood_pressure_diastolic) : null,
        heart_rate: values.heart_rate ? Number(values.heart_rate) : null,
        respiratory_rate: values.respiratory_rate ? Number(values.respiratory_rate) : null,
        temperature: values.temperature ? Number(values.temperature) : null,
        spo2: values.spo2 ? Number(values.spo2) : null,
        weight: values.weight ? Number(values.weight) : null,
        height: values.height ? Number(values.height) : null,
      };
      if (existing?.id) {
        const { error } = await supabase.from('vital_signs').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vital_signs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-vitals', visitId] });
      setSavedMsg('Vital signs saved.');
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) return <p className="text-sm text-secondary-500">Loading vital signs...</p>;

  const fields: Array<{ key: keyof typeof form; label: string; unit: string }> = [
    { key: 'blood_pressure_systolic', label: 'BP Systolic', unit: 'mmHg' },
    { key: 'blood_pressure_diastolic', label: 'BP Diastolic', unit: 'mmHg' },
    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { key: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min' },
    { key: 'temperature', label: 'Temperature', unit: '°C' },
    { key: 'spo2', label: 'SpO2', unit: '%' },
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'height', label: 'Height', unit: 'cm' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-secondary-900">Vital Signs</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-secondary-500">{f.label}</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                className="input pr-12"
                value={form[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                placeholder="--"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-400">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Vitals'}
        </button>
        {savedMsg && <span className="text-sm text-success-600">{savedMsg}</span>}
        {saveMutation.isError && (
          <span className="text-sm text-error-600">Failed to save: {(saveMutation.error as Error).message}</span>
        )}
      </div>
    </form>
  );
}
