import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { patientSchema, type PatientFormValues } from './schemas';
import { createPatient } from './queries';
import type { BloodType, Gender } from '@/types';

interface PatientFormModalProps {
  open: boolean;
  onClose: () => void;
}

const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_TYPES: BloodType[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
];

export function PatientFormModal({ open, onClose }: PatientFormModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: '',
      nik: '',
      date_of_birth: '',
      gender: undefined,
      phone: '',
      email: '',
      address: '',
      blood_type: undefined,
      emergency_contact_name: '',
      emergency_contact_phone: '',
      insurance: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PatientFormValues) => {
      // Convert empty strings to null for optional fields
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        payload[k] = v === '' ? null : v;
      }
      return createPatient(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      setSubmitError(null);
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to register patient';
      setSubmitError(msg);
    },
  });

  if (!open) return null;

  const onSubmit = (values: PatientFormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-secondary-900">
              Register New Patient
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
            disabled={mutation.isPending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Full Name <span className="text-error-600">*</span>
              </label>
              <input
                {...register('full_name')}
                className="input"
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-xs text-error-600 mt-1">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                NIK
              </label>
              <input {...register('nik')} className="input" placeholder="16-digit ID" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Date of Birth
              </label>
              <input type="date" {...register('date_of_birth')} className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Gender
              </label>
              <select {...register('gender')} className="input">
                <option value="">Select...</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Blood Type
              </label>
              <select {...register('blood_type')} className="input">
                <option value="">Select...</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Phone
              </label>
              <input {...register('phone')} className="input" placeholder="08xx..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Email
              </label>
              <input type="email" {...register('email')} className="input" placeholder="john@example.com" />
              {errors.email && (
                <p className="text-xs text-error-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Address
              </label>
              <textarea {...register('address')} className="input" rows={2} placeholder="Street, city, province" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Insurance
              </label>
              <input {...register('insurance')} className="input" placeholder="BPJS / private" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Emergency Contact Name
              </label>
              <input {...register('emergency_contact_name')} className="input" placeholder="Contact person" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Emergency Contact Phone
              </label>
              <input {...register('emergency_contact_phone')} className="input" placeholder="08xx..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-secondary-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { supabase };
