import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { Doctor, DoctorSchedule } from '@/types';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Stethoscope, Pencil, Clock, X, Info } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const editSchema = z.object({
  specialty: z.string().min(1, 'Specialty is required').max(100),
  license_number: z.string().min(1, 'License is required').max(50),
});
type EditForm = z.infer<typeof editSchema>;

export function AdminDoctorsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [schedulesFor, setSchedulesFor] = useState<Doctor | null>(null);

  const { data: doctors, isLoading, isError } = useQuery<Doctor[]>({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, staff!inner(id, full_name, email, phone, is_active, role_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Doctor[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string; specialty: string; license_number: string }) => {
      const { error } = await supabase
        .from('doctors')
        .update({ specialty: vars.specialty, license_number: vars.license_number, updated_at: new Date().toISOString() })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      setEditing(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (vars: { staffId: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: vars.is_active, updated_at: new Date().toISOString() })
        .eq('id', vars.staffId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-doctors'] }),
  });

  return (
    <div>
      <PageHeader
        title="Doctor Management"
        subtitle="Manage doctor profiles, specialties, and schedules"
      />
      <div className="card p-3 mb-4 flex items-start gap-2 bg-primary-50 border-primary-200">
        <Info className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
        <p className="text-sm text-primary-700">
          New doctor accounts are created via the admin seed/edge function (auth users cannot be created from the client).
          Here you can edit specialty/license and toggle active status.
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load doctors" />
      ) : !doctors || doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors" message="No doctor records found." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Specialty</th>
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {doctors.map((d) => (
                <tr key={d.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-medium text-secondary-900">{d.staff?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-700">{d.specialty}</td>
                  <td className="px-4 py-3 text-secondary-700">{d.license_number}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ staffId: d.id, is_active: !d.staff?.is_active })}
                      className={`badge border ${d.staff?.is_active ? 'bg-success-100 text-success-700 border-success-200' : 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}
                    >
                      {d.staff?.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setSchedulesFor(d)} className="btn-secondary !px-2 !py-1" title="View schedule">
                        <Clock className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditing(d)} className="btn-secondary !px-2 !py-1" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditDoctorModal doctor={editing} onClose={() => setEditing(null)} onSubmit={(v) => updateMutation.mutate({ id: editing.id, ...v })} submitting={updateMutation.isPending} />
      )}
      {schedulesFor && <ScheduleModal doctor={schedulesFor} onClose={() => setSchedulesFor(null)} />}
    </div>
  );
}

function EditDoctorModal({ doctor, onClose, onSubmit, submitting }: { doctor: Doctor; onClose: () => void; onSubmit: (v: EditForm) => void; submitting: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { specialty: doctor.specialty, license_number: doctor.license_number },
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Edit Doctor</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-secondary-700">Name</label>
            <input className="input mt-1" value={doctor.staff?.full_name ?? ''} disabled />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-700">Specialty</label>
            <input className="input mt-1" {...register('specialty')} />
            {errors.specialty && <p className="text-xs text-error-600 mt-1">{errors.specialty.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-secondary-700">License Number</label>
            <input className="input mt-1" {...register('license_number')} />
            {errors.license_number && <p className="text-xs text-error-600 mt-1">{errors.license_number.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const { data: schedules, isLoading, isError } = useQuery<DoctorSchedule[]>({
    queryKey: ['doctor-schedules', doctor.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('doctor_schedules').select('*').eq('doctor_id', doctor.id).order('day_of_week');
      if (error) throw error;
      return data as DoctorSchedule[];
    },
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900">Weekly Schedule</h2>
            <p className="text-sm text-secondary-500">{doctor.staff?.full_name} — {doctor.specialty}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        {isLoading ? <LoadingState /> : isError ? <ErrorState message="Failed to load schedules" /> : !schedules || schedules.length === 0 ? (
          <EmptyState icon={Clock} title="No schedule" message="No schedule entries. Manage schedules on the Schedules page." />
        ) : (
          <div className="space-y-2">
            {DAYS.map((day, idx) => {
              const entries = schedules.filter((s) => s.day_of_week === idx);
              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary-50">
                  <div className="w-24 text-sm font-medium text-secondary-900 shrink-0">{day}</div>
                  <div className="flex-1 space-y-1">
                    {entries.length === 0 ? (
                      <span className="text-sm text-secondary-400">Off</span>
                    ) : entries.map((e) => (
                      <div key={e.id} className="text-sm text-secondary-700">
                        {e.start_time}–{e.end_time}
                        {e.break_start && e.break_end && ` (break ${e.break_start}–${e.break_end})`}
                        <span className="text-secondary-400"> · ${e.slot_duration_minutes}min slots · ${e.max_patients} max</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
