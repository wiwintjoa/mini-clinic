import { supabase } from '@/lib/supabase';
import type { Appointment, Doctor, Patient, Service } from '@/types';

export async function fetchAppointments(date: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      '*, patient:patients(*), doctor:doctors(*, staff:staff(*)), service:services(*)',
    )
    .eq('appointment_date', date)
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchPatientsForSelect(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, mrn, full_name, phone')
    .eq('status', 'ACTIVE')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Patient[];
}

export async function fetchDoctorsForSelect(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, specialty, staff:staff(id, full_name)')
    .order('specialty', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Doctor[];
}

export async function fetchServicesForSelect(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function createAppointment(values: {
  patient_id: string;
  doctor_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...values, status: 'BOOKED' })
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function checkInAppointment(appointment: Appointment): Promise<void> {
  // Update appointment status
  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'CHECKED_IN' })
    .eq('id', appointment.id);
  if (updateErr) throw updateErr;

  // Generate queue number
  const { data: queueNumber, error: queueErr } = await supabase.rpc(
    'generate_queue_number',
    { doctor_id_param: appointment.doctor_id },
  );
  if (queueErr) throw queueErr;

  // Create queue entry
  const { error: insertErr } = await supabase.from('queue_entries').insert({
    queue_number: queueNumber,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    appointment_id: appointment.id,
    status: 'WAITING',
  });
  if (insertErr) throw insertErr;
}
