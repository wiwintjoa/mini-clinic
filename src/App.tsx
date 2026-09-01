import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getHomeRoute } from '@/lib/rbac';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute, RoleRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard';
import { ReceptionistDashboard } from '@/pages/dashboards/ReceptionistDashboard';
import { DoctorDashboard } from '@/pages/dashboards/DoctorDashboard';
import { PharmacistDashboard } from '@/pages/dashboards/PharmacistDashboard';
import { PatientDashboard } from '@/pages/dashboards/PatientDashboard';

import { AdminDoctorsPage } from '@/features/admin/AdminDoctorsPage';
import { AdminStaffPage } from '@/features/admin/AdminStaffPage';
import { AdminServicesPage } from '@/features/admin/AdminServicesPage';
import { AdminSchedulesPage } from '@/features/admin/AdminSchedulesPage';
import { AdminReportsPage } from '@/features/admin/AdminReportsPage';

import { PatientsPage } from '@/features/frontoffice/PatientsPage';
import { AppointmentsPage } from '@/features/frontoffice/AppointmentsPage';
import { QueuePage } from '@/features/frontoffice/QueuePage';
import { BillingPage } from '@/features/frontoffice/BillingPage';

import { DoctorQueuePage } from '@/features/doctor/DoctorQueuePage';
import { ConsultationPage } from '@/features/doctor/ConsultationPage';

import { PrescriptionsPage } from '@/features/pharmacy/PrescriptionsPage';
import { InventoryPage } from '@/features/pharmacy/InventoryPage';

import { PatientAppointmentsPage } from '@/features/patient/PatientAppointmentsPage';
import { PatientQueuePage } from '@/features/patient/PatientQueuePage';
import { PatientHistoryPage } from '@/features/patient/PatientHistoryPage';
import { PatientPrescriptionsPage } from '@/features/patient/PatientPrescriptionsPage';
import { PatientInvoicesPage } from '@/features/patient/PatientInvoicesPage';

import type { RoleName } from '@/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthenticatedApp() {
  const { role } = useAuthStore();
  if (!role) return null;
  const allowed: RoleName[] = [role];

  return (
    <AppShell role={role}>
      <Routes>
        {/* Admin */}
        <Route path="/admin" element={<RoleRoute allowed={['ADMIN']}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
        <Route path="/admin/staff" element={<AdminStaffPage />} />
        <Route path="/admin/services" element={<AdminServicesPage />} />
        <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />

        {/* Front Office */}
        <Route path="/front-office" element={<RoleRoute allowed={['RECEPTIONIST']}><ReceptionistDashboard /></RoleRoute>} />
        <Route path="/front-office/patients" element={<PatientsPage />} />
        <Route path="/front-office/appointments" element={<AppointmentsPage />} />
        <Route path="/front-office/queue" element={<QueuePage />} />
        <Route path="/front-office/billing" element={<BillingPage />} />

        {/* Doctor */}
        <Route path="/doctor" element={<RoleRoute allowed={['DOCTOR']}><DoctorDashboard /></RoleRoute>} />
        <Route path="/doctor/queue" element={<DoctorQueuePage />} />
        <Route path="/doctor/consultations" element={<DoctorQueuePage />} />
        <Route path="/doctor/consultation/:visitId" element={<ConsultationPageWrapper />} />

        {/* Pharmacy */}
        <Route path="/pharmacy" element={<RoleRoute allowed={['PHARMACIST']}><PharmacistDashboard /></RoleRoute>} />
        <Route path="/pharmacy/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/pharmacy/inventory" element={<InventoryPage />} />

        {/* Patient Portal */}
        <Route path="/patient" element={<RoleRoute allowed={['PATIENT']}><PatientDashboard /></RoleRoute>} />
        <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
        <Route path="/patient/queue" element={<PatientQueuePage />} />
        <Route path="/patient/history" element={<PatientHistoryPage />} />
        <Route path="/patient/prescriptions" element={<PatientPrescriptionsPage />} />
        <Route path="/patient/invoices" element={<PatientInvoicesPage />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={getHomeRoute(role)} replace />} />
      </Routes>
    </AppShell>
  );
}

import { useParams } from 'react-router-dom';

function ConsultationPageWrapper() {
  const { visitId } = useParams<{ visitId: string }>();
  if (!visitId) return <Navigate to="/doctor/queue" replace />;
  return <ConsultationPage visitId={visitId} />;
}

function AppRoutes() {
  const { initialized, user } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
