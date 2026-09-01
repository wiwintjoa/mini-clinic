import type { RoleName } from '@/types';

export const ROLE_ROUTES: Record<RoleName, string> = {
  ADMIN: '/admin',
  RECEPTIONIST: '/front-office',
  DOCTOR: '/doctor',
  PHARMACIST: '/pharmacy',
  PATIENT: '/patient',
};

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Administrator',
  RECEPTIONIST: 'Receptionist',
  DOCTOR: 'Doctor',
  PHARMACIST: 'Pharmacist',
  PATIENT: 'Patient',
};

export const ROLE_COLORS: Record<RoleName, string> = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  RECEPTIONIST: 'bg-blue-100 text-blue-700 border-blue-200',
  DOCTOR: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PHARMACIST: 'bg-amber-100 text-amber-700 border-amber-200',
  PATIENT: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function getHomeRoute(role: RoleName | null): string {
  if (!role) return '/login';
  return ROLE_ROUTES[role];
}

export function canAccess(role: RoleName | null, allowed: RoleName[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
