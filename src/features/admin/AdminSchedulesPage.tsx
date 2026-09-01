import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Doctor, DoctorSchedule } from '@/types';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Clock, Plus, Trash2, X } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  slot_duration_minutes: number;
  max_patients: number;
}

export function AdminSchedulesPage() {
  const qc = useQueryClient();
  const [doctorId, setDoctorId] = useState<string>('');
  const [editing, setEditing] = useState<{ day: number; entry?: DoctorSchedule } | null>(null);

  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, staff!inner(id, full_name, is_active)')
        .order('created_at');
      if (error) throw error;
      return data as Doctor[];
    },
  });

  useEffect(() => {
    if (!doctorId && doctors && doctors.length > 0) setDoctorId(doctors[0].id);
  }, [doctors, doctorId]);

  const { data: schedules, isLoading, isError } = useQuery<DoctorSchedule[]>({
    queryKey: ['doctor-schedules', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data, error } = await supabase.from('doctor_schedules').select('*').eq('doctor_id', doctorId).order('day_of_week');
      if (error) throw error;
      return data as DoctorSchedule[];
    },
    enabled: !!doctorId,
  });

  const saveMutation = useMutation({
    mutationFn: async (vars: ScheduleInput & { id?: string }) => {
      const { id, ...rest } = vars;
      const payload = { ...rest, doctor_id: doctorId };
      if (id) {
        const { error } = await supabase.from('doctor_schedules').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('doctor_schedules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctor-schedules', doctorId] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('doctor_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-schedules', doctorId] }),
  });

  return (
    <div>
      <PageHeader title="Doctor Schedules" subtitle="Manage weekly schedules for each doctor" />
      <div className="mb-4">
        <label className="text-sm font-medium text-secondary-700">Select Doctor</label>
        <select className="input mt-1 max-w-xs" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">— Select —</option>
          {(doctors ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.staff?.full_name} — {d.specialty}</option>
          ))}
        </select>
      </div>

      {!doctorId ? (
        <EmptyState icon={Clock} title="Select a doctor" message="Choose a doctor to manage their schedule." />
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Failed to load schedules" />
      ) : (
        <div className="space-y-2">
          {DAYS.map((day, idx) => {
            const entries = (schedules ?? []).filter((s) => s.day_of_week === idx);
            return (
              <div key={idx} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-secondary-900">{day}</h3>
                  <button onClick={() => setEditing({ day: idx })} className="btn-secondary !px-2 !py-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {entries.length === 0 ? (
                  <p className="text-sm text-secondary-400">Off day</p>
                ) : (
                  <div className="space-y-1">
                    {entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-sm bg-secondary-50 rounded px-3 py-2">
                        <div className="text-secondary-700">
                          {e.start_time}–{e.end_time}
                          {e.break_start && e.break_end && <span className="text-secondary-400"> (break {e.break_start}–{e.break_end})</span>}
                          <span className="text-secondary-400"> · {e.slot_duration_minutes}min · {e.max_patients} max</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditing({ day: idx, entry: e })} className="btn-secondary !px-2 !py-0.5 text-xs">Edit</button>
                          <button onClick={() => deleteMutation.mutate(e.id)} className="btn-secondary !px-2 !py-0.5 text-xs text-error-600"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ScheduleModal
          day={editing.day}
          entry={editing.entry}
          onClose={() => setEditing(null)}
          onSubmit={(v) => saveMutation.mutate({ ...v, id: editing.entry?.id })}
          submitting={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function ScheduleModal({ day, entry, onClose, onSubmit, submitting }: {
  day: number;
  entry?: DoctorSchedule;
  onClose: () => void;
  onSubmit: (v: ScheduleInput) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ScheduleInput>({
    day_of_week: day,
    start_time: entry?.start_time ?? '08:00',
    end_time: entry?.end_time ?? '16:00',
    break_start: entry?.break_start ?? '',
    break_end: entry?.break_end ?? '',
    slot_duration_minutes: entry?.slot_duration_minutes ?? 30,
    max_patients: entry?.max_patients ?? 20,
  });

  const set = (k: keyof ScheduleInput, v: string | number | null) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">{entry ? 'Edit' : 'Add'} Schedule — {DAYS[day]}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, break_start: form.break_start || null, break_end: form.break_end || null }); }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-secondary-700">Start</label>
              <input type="time" className="input mt-1" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">End</label>
              <input type="time" className="input mt-1" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Break Start</label>
              <input type="time" className="input mt-1" value={form.break_start ?? ''} onChange={(e) => set('break_start', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Break End</label>
              <input type="time" className="input mt-1" value={form.break_end ?? ''} onChange={(e) => set('break_end', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Slot (min)</label>
              <input type="number" className="input mt-1" value={form.slot_duration_minutes} onChange={(e) => set('slot_duration_minutes', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Max Patients</label>
              <input type="number" className="input mt-1" value={form.max_patients} onChange={(e) => set('max_patients', Number(e.target.value))} />
            </div>
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
