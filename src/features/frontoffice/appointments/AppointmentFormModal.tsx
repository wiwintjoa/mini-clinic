import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, CalendarPlus, Search } from 'lucide-react';
import { addMinutes, format } from 'date-fns';
import { appointmentSchema, type AppointmentFormValues } from './schemas';
import {
  fetchPatientsForSelect,
  fetchDoctorsForSelect,
  fetchServicesForSelect,
  createAppointment,
} from './queries';
import type { Doctor, Patient, Service } from '@/types';

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function AppointmentFormModal({ open, onClose }: AppointmentFormModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-select'],
    queryFn: fetchPatientsForSelect,
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: fetchDoctorsForSelect,
  });
  const { data: services = [] } = useQuery({
    queryKey: ['services-select'],
    queryFn: fetchServicesForSelect,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: '',
      doctor_id: '',
      service_id: '',
      appointment_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      notes: '',
    },
  });

  const selectedServiceId = watch('service_id');
  const selectedStartTime = watch('start_time');
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const computedEndTime = (() => {
    if (!selectedService || !selectedStartTime) return '';
    const [h, m] = selectedStartTime.split(':').map(Number);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    const end = addMinutes(base, selectedService.duration_minutes);
    return format(end, 'HH:mm');
  })();

  const mutation = useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      createAppointment({
        patient_id: values.patient_id,
        doctor_id: values.doctor_id,
        service_id: values.service_id,
        appointment_date: values.appointment_date,
        start_time: values.start_time,
        end_time: computedEndTime,
        notes: values.notes === '' ? null : values.notes ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      reset();
      setSubmitError(null);
      setPatientSearch('');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create appointment';
      setSubmitError(msg);
    },
  });

  if (!open) return null;

  const filteredPatients = patients.filter((p: Patient) =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-secondary-900">New Appointment</h2>
          </div>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600" disabled={mutation.isPending}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit((v) => { setSubmitError(null); mutation.mutate(v); })} className="space-y-4">
          {/* Patient searchable select */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Patient <span className="text-error-600">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name or MRN..."
                className="input pl-10 mb-1"
              />
            </div>
            <select {...register('patient_id')} className="input">
              <option value="">Select patient...</option>
              {filteredPatients.map((p: Patient) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} — {p.full_name}
                </option>
              ))}
            </select>
            {errors.patient_id && (
              <p className="text-xs text-error-600 mt-1">{errors.patient_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Doctor <span className="text-error-600">*</span></label>
              <select {...register('doctor_id')} className="input">
                <option value="">Select...</option>
                {doctors.map((d: Doctor) => (
                  <option key={d.id} value={d.id}>
                    {d.staff?.full_name ?? 'Unknown'} — {d.specialty}
                  </option>
                ))}
              </select>
              {errors.doctor_id && <p className="text-xs text-error-600 mt-1">{errors.doctor_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Service <span className="text-error-600">*</span></label>
              <select
                {...register('service_id')}
                className="input"
                onChange={(e) => setValue('service_id', e.target.value, { shouldValidate: true })}
              >
                <option value="">Select...</option>
                {services.map((s: Service) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — Rp{(s.price).toLocaleString('id-ID')} ({s.duration_minutes}m)
                  </option>
                ))}
              </select>
              {errors.service_id && <p className="text-xs text-error-600 mt-1">{errors.service_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Date <span className="text-error-600">*</span></label>
              <input type="date" {...register('appointment_date')} className="input" />
              {errors.appointment_date && <p className="text-xs text-error-600 mt-1">{errors.appointment_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Start Time <span className="text-error-600">*</span></label>
              <input type="time" {...register('start_time')} className="input" />
              {errors.start_time && <p className="text-xs text-error-600 mt-1">{errors.start_time.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">End Time (auto)</label>
              <input type="time" value={computedEndTime} readOnly className="input bg-secondary-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Notes</label>
            <textarea {...register('notes')} className="input" rows={2} placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-secondary-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                'Create Appointment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
