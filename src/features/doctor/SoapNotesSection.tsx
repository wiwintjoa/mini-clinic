import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Save } from 'lucide-react';

const soapSchema = z.object({
  chief_complaint: z.string(),
  history_present_illness: z.string(),
  physical_examination: z.string(),
  clinical_findings: z.string(),
  assessment: z.string(),
  plan: z.string(),
  treatment: z.string(),
  follow_up: z.string(),
  additional_notes: z.string(),
});

type SoapFormValues = z.infer<typeof soapSchema>;

interface SoapNotesSectionProps {
  visitId: string;
  initialData?: Partial<SoapFormValues>;
}

export function SoapNotesSection({ visitId, initialData }: SoapNotesSectionProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    resolver: zodResolver(soapSchema),
    defaultValues: {
      chief_complaint: '',
      history_present_illness: '',
      physical_examination: '',
      clinical_findings: '',
      assessment: '',
      plan: '',
      treatment: '',
      follow_up: '',
      additional_notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        chief_complaint: initialData.chief_complaint ?? '',
        history_present_illness: initialData.history_present_illness ?? '',
        physical_examination: initialData.physical_examination ?? '',
        clinical_findings: initialData.clinical_findings ?? '',
        assessment: initialData.assessment ?? '',
        plan: initialData.plan ?? '',
        treatment: initialData.treatment ?? '',
        follow_up: initialData.follow_up ?? '',
        additional_notes: initialData.additional_notes ?? '',
      });
    }
  }, [initialData, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: SoapFormValues) => {
      const { error } = await supabase
        .from('visits')
        .update({
          ...values,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', visitId] });
    },
  });

  const onSubmit = (values: SoapFormValues) => {
    saveMutation.mutate(values);
  };

  const sections: Array<{ key: keyof SoapFormValues; label: string; rows?: number; hint?: string }> = [
    { key: 'chief_complaint', label: 'Chief Complaint', rows: 2, hint: 'Subjective' },
    { key: 'history_present_illness', label: 'History of Present Illness', rows: 4, hint: 'Subjective' },
    { key: 'physical_examination', label: 'Physical Examination', rows: 4, hint: 'Objective' },
    { key: 'clinical_findings', label: 'Clinical Findings', rows: 4, hint: 'Objective' },
    { key: 'assessment', label: 'Assessment', rows: 4, hint: 'Assessment' },
    { key: 'plan', label: 'Plan', rows: 3, hint: 'Plan' },
    { key: 'treatment', label: 'Treatment', rows: 3, hint: 'Plan' },
    { key: 'follow_up', label: 'Follow Up', rows: 2, hint: 'Plan' },
    { key: 'additional_notes', label: 'Additional Notes', rows: 3, hint: 'Plan' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-secondary-700">{s.label}</label>
              {s.hint && <span className="text-xs text-secondary-400">{s.hint}</span>}
            </div>
            <textarea
              {...register(s.key)}
              rows={s.rows ?? 3}
              className="input resize-y"
              placeholder={`Enter ${s.label.toLowerCase()}...`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saveMutation.isPending || !isDirty}>
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save SOAP Notes'}
        </button>
        {saveMutation.isSuccess && <span className="text-sm text-success-600">Saved.</span>}
        {saveMutation.isError && (
          <span className="text-sm text-error-600">Error: {(saveMutation.error as Error).message}</span>
        )}
      </div>
    </form>
  );
}
