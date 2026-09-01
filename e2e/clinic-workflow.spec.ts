import { expect, test, type APIRequestContext } from '@playwright/test';

type Session = { accessToken: string; user: { id: string; role: string } };
const password = process.env.E2E_PASSWORD ?? 'ClinicDemo123!';

async function login(request: APIRequestContext, email: string): Promise<Session> {
  const response = await request.post('auth/login', { data: { email, password } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data as Session;
}
const auth = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });
async function data<T>(response: { ok(): boolean; text(): Promise<string>; json(): Promise<unknown> }): Promise<T> {
  expect(response.ok(), await response.text()).toBeTruthy();
  return ((await response.json()) as { data: T }).data;
}

test('registered patient completes the outpatient workflow and sees their records', async ({ request }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.patient.${suffix}@example.test`;
  const portalPassword = 'E2ePatient123!';
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(new Date());
  const receptionist = await login(request, 'receptionist@clinic.local');
  const admin = await login(request, 'admin@clinic.local');
  const doctorSession = await login(request, 'doctor@clinic.local');
  const pharmacist = await login(request, 'pharmacist@clinic.local');

  const patient = await data<{ id: string; mrn: string }>(await request.post('patients', { headers: auth(receptionist), data: { fullName: `E2E Patient ${suffix}`, nik: `99${suffix.replace(/\D/g, '').slice(-14).padStart(14, '0')}`, dateOfBirth: '1990-05-15', gender: 'FEMALE', phone: `08${suffix.slice(-10).padStart(10, '0')}`, email, address: 'Synthetic E2E Address, Test District', bloodType: 'O', status: 'ACTIVE', emergencyContact: { name: 'Synthetic Contact', phone: '081234567891', relationship: 'SPOUSE' }, payment: { type: 'SELF_PAY' }, initialMeasurement: { systolicBloodPressure: 120, diastolicBloodPressure: 80, weightKg: 58, heightCm: 162 } } }));
  expect(patient.mrn).toMatch(/^CLN-\d{6}$/);
  await data(await request.post('users/patient-accounts', { headers: auth(admin), data: { patientId: patient.id, email, password: portalPassword } }));

  const doctors = await data<Array<{ id: string; fullName: string }>>(await request.get('doctors', { headers: auth(receptionist) }));
  const services = await data<Array<{ id: string; name: string }>>(await request.get('services', { headers: auth(receptionist) }));
  const doctor = doctors.find((item) => item.fullName === 'Dr. Demo Physician') ?? doctors[0];
  const service = services.find((item) => item.name === 'General Consultation') ?? services[0];
  const appointmentList = await request.get(`appointments?page=1&limit=100&date=${today}`, { headers: auth(receptionist) });
  expect(appointmentList.ok(), await appointmentList.text()).toBeTruthy();
  const existing = ((await appointmentList.json()) as { data: Array<{ doctorId: string; startTime: string }> }).data.filter((item) => item.doctorId === doctor.id).map((item) => item.startTime.slice(0, 5));
  const startTime = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30'].find((slot) => !existing.includes(slot));
  expect(startTime, 'No E2E appointment slot remains today').toBeTruthy();
  const [hour, minute] = startTime!.split(':').map(Number); const endMinutes = hour * 60 + minute + 30; const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const appointment = await data<{ id: string }>(await request.post('appointments', { headers: auth(receptionist), data: { patientId: patient.id, doctorId: doctor.id, serviceId: service.id, appointmentDate: today, startTime, endTime, notes: 'Critical Playwright E2E workflow' } }));
  const queue = await data<{ id: string; queueNumber: string }>(await request.post(`queue/check-in/${appointment.id}`, { headers: auth(receptionist), data: { measurement: { systolicBloodPressure: 118, diastolicBloodPressure: 76, weightKg: 58, heightCm: 162, temperature: 36.7, heartRate: 72, respiratoryRate: 16, oxygenSaturation: 99 } } }));
  expect(queue.queueNumber).toMatch(/^A-\d{3}$/);

  const visit = await data<{ id: string }>(await request.post(`visits/from-queue/${queue.id}`, { headers: auth(doctorSession) }));
  await data(await request.put(`visits/${visit.id}/vitals`, { headers: auth(doctorSession), data: { systolic: 118, diastolic: 76, heartRate: 72, respiratoryRate: 16, temperature: 36.7, spo2: 99, weight: 58, height: 162 } }));
  await data(await request.patch(`visits/${visit.id}/consultation`, { headers: auth(doctorSession), data: { chiefComplaint: 'Synthetic E2E headache', examinationFindings: 'Patient alert and comfortable. No red flags.', clinicalNote: 'Mild intermittent headache for one day.', treatmentNote: 'Hydration, rest, and symptomatic medicine.', followUpNote: 'Return if symptoms persist.' } }));
  const diagnoses = await data<Array<{ id: string; icd10Code: string }>>(await request.get('diagnoses?search=R51', { headers: auth(doctorSession) }));
  expect(diagnoses.length).toBeGreaterThan(0);
  await data(await request.post(`visits/${visit.id}/diagnoses`, { headers: auth(doctorSession), data: { diagnosisId: diagnoses[0].id, isPrimary: true } }));
  const prescription = await data<{ id: string; prescriptionNumber: string }>(await request.post('prescriptions', { headers: auth(doctorSession), data: { visitId: visit.id } }));
  const medicines = await data<Array<{ id: string; name: string }>>(await request.get('pharmacy/medicines?search=Paracetamol', { headers: auth(pharmacist) }));
  const medicine = medicines.find((item) => item.name.includes('Paracetamol'))!;
  const inventoryBefore = await data<Array<{ id: string; totalStock: string }>>(await request.get('inventory', { headers: auth(pharmacist) }));
  const stockBefore = Number(inventoryBefore.find((item) => item.id === medicine.id)!.totalStock);
  await data(await request.post(`prescriptions/${prescription.id}/items`, { headers: auth(doctorSession), data: { medicineId: medicine.id, dosage: '1 tablet', frequency: '2 times daily', route: 'Oral', durationDays: 2, quantity: 4, instructions: 'After meals' } }));
  await data(await request.post(`visits/${visit.id}/complete`, { headers: auth(doctorSession) }));
  const autoSubmitted = await data<{ status: string }>(await request.get(`prescriptions/${prescription.id}`, { headers: auth(doctorSession) }));
  expect(autoSubmitted.status).toBe('SUBMITTED');
  const measurements = await request.get(`patients/${patient.id}/vital-signs?page=1&limit=20`, { headers: auth(receptionist) });
  expect(measurements.ok(), await measurements.text()).toBeTruthy();
  expect(((await measurements.json()) as { data: Array<{ visitId: string | null }> }).data.some((item) => item.visitId === visit.id)).toBeTruthy();

  await data(await request.post(`pharmacy/prescriptions/${prescription.id}/process`, { headers: auth(pharmacist) }));
  await data(await request.post(`pharmacy/prescriptions/${prescription.id}/ready`, { headers: auth(pharmacist) }));
  const dispensing = await data<{ status: string; allocations: Array<{ quantity: number }> }>(await request.post(`pharmacy/prescriptions/${prescription.id}/dispense`, { headers: auth(pharmacist) }));
  expect(dispensing.status).toBe('DISPENSED');
  expect(dispensing.allocations.reduce((sum, item) => sum + item.quantity, 0)).toBe(4);
  const inventoryAfter = await data<Array<{ id: string; totalStock: string }>>(await request.get('inventory', { headers: auth(pharmacist) }));
  expect(Number(inventoryAfter.find((item) => item.id === medicine.id)!.totalStock)).toBe(stockBefore - 4);

  const invoice = await data<{ id: string; grandTotal: string; invoiceNumber: string }>(await request.post(`billing/visits/${visit.id}/invoice`, { headers: auth(receptionist), data: { discount: 0, tax: 0 } }));
  const payment = await data<{ invoice: { status: string }; balance: string }>(await request.post('payments', { headers: auth(receptionist), data: { invoiceId: invoice.id, amount: Number(invoice.grandTotal), method: 'CASH' } }));
  expect(payment.invoice.status).toBe('PAID'); expect(payment.balance).toBe('0.00');

  const patientLoginResponse = await request.post('auth/login', { data: { email, password: portalPassword } });
  expect(patientLoginResponse.ok(), await patientLoginResponse.text()).toBeTruthy();
  const patientSession = (await patientLoginResponse.json()).data as Session;
  const history = await data<Array<{ id: string }>>(await request.get('patient-portal/history', { headers: auth(patientSession) }));
  const patientPrescriptions = await data<Array<{ id: string; status: string }>>(await request.get('patient-portal/prescriptions', { headers: auth(patientSession) }));
  const patientInvoices = await data<Array<{ id: string; status: string }>>(await request.get('patient-portal/invoices', { headers: auth(patientSession) }));
  expect(history.some((item) => item.id === visit.id)).toBeTruthy();
  expect(patientPrescriptions).toContainEqual(expect.objectContaining({ id: prescription.id, status: 'DISPENSED' }));
  expect(patientInvoices).toContainEqual(expect.objectContaining({ id: invoice.id, status: 'PAID' }));
});
