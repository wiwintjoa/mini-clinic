import type { RoleName } from '@/types';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ListOrdered,
  Stethoscope,
  Pill,
  Package,
  Receipt,
  BarChart3,
  UserCog,
  CalendarClock,
  Clock,
  FileText,
  CreditCard,
  History,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_CONFIG: Record<RoleName, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
    { label: 'Staff', path: '/admin/staff', icon: UserCog },
    { label: 'Services', path: '/admin/services', icon: Package },
    { label: 'Schedules', path: '/admin/schedules', icon: CalendarClock },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  ],
  RECEPTIONIST: [
    { label: 'Dashboard', path: '/front-office', icon: LayoutDashboard },
    { label: 'Patients', path: '/front-office/patients', icon: Users },
    { label: 'Appointments', path: '/front-office/appointments', icon: CalendarDays },
    { label: 'Queue', path: '/front-office/queue', icon: ListOrdered },
    { label: 'Billing', path: '/front-office/billing', icon: Receipt },
  ],
  DOCTOR: [
    { label: 'Dashboard', path: '/doctor', icon: LayoutDashboard },
    { label: "Today's Queue", path: '/doctor/queue', icon: ListOrdered },
    { label: 'Consultations', path: '/doctor/consultations', icon: Stethoscope },
  ],
  PHARMACIST: [
    { label: 'Dashboard', path: '/pharmacy', icon: LayoutDashboard },
    { label: 'Prescriptions', path: '/pharmacy/prescriptions', icon: FileText },
    { label: 'Inventory', path: '/pharmacy/inventory', icon: Package },
  ],
  PATIENT: [
    { label: 'Dashboard', path: '/patient', icon: LayoutDashboard },
    { label: 'Appointments', path: '/patient/appointments', icon: CalendarDays },
    { label: 'Queue', path: '/patient/queue', icon: Clock },
    { label: 'Medical History', path: '/patient/history', icon: History },
    { label: 'Prescriptions', path: '/patient/prescriptions', icon: FileText },
    { label: 'Invoices', path: '/patient/invoices', icon: CreditCard },
  ],
};
