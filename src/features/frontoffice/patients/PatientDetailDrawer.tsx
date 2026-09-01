import { useQuery } from '@tanstack/react-query';
import { X, User, Phone, Mail, MapPin, Droplet, Shield, Calendar, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPatientDetail } from './queries';
import { LoadingState, ErrorState } from '@/components/common/States';
import type { PatientStatus } from '@/types';

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<PatientStatus, string> = {
  ACTIVE: 'bg-success-50 text-success-700 border-success-200',
  INACTIVE: 'bg-secondary-50 text-secondary-600 border-secondary-200',
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-secondary-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-secondary-500">{label}</p>
        <p className="text-sm text-secondary-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export function PatientDetailDrawer({ patientId, onClose }: PatientDetailDrawerProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: () => fetchPatientDetail(patientId!),
    enabled: !!patientId,
  });

  if (!patientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="card w-full max-w-md h-full overflow-y-auto rounded-none border-l border-y-0 border-r-0">
        <div className="flex items-center justify-between p-4 border-b border-secondary-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-secondary-900">Patient Details</h2>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && <LoadingState message="Loading patient..." />}
        {isError && <ErrorState message="Failed to load patient details" />}

        {data && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-secondary-900">
                  {data.patient.full_name}
                </h3>
                <p className="text-sm text-secondary-500">MRN: {data.patient.mrn}</p>
              </div>
            </div>

            <span
              className={`badge ${STATUS_STYLES[data.patient.status]}`}
            >
              {data.patient.status}
            </span>

            {/* Info */}
            <div className="card p-3 divide-y divide-secondary-50">
              <InfoRow icon={Calendar} label="Date of Birth" value={data.patient.date_of_birth ? format(new Date(data.patient.date_of_birth), 'MMM d, yyyy') : null} />
              <InfoRow icon={User} label="Gender" value={data.patient.gender} />
              <InfoRow icon={Phone} label="Phone" value={data.patient.phone} />
              <InfoRow icon={Mail} label="Email" value={data.patient.email} />
              <InfoRow icon={MapPin} label="Address" value={data.patient.address} />
              <InfoRow icon={Droplet} label="Blood Type" value={data.patient.blood_type} />
              <InfoRow icon={Shield} label="Insurance" value={data.patient.insurance} />
              <InfoRow icon={Heart} label="Emergency Contact" value={data.patient.emergency_contact_name ? `${data.patient.emergency_contact_name} (${data.patient.emergency_contact_phone ?? '—'})` : null} />
            </div>

            {/* Visit History */}
            <div>
              <h4 className="text-sm font-semibold text-secondary-900 mb-2">
                Visit History ({data.visits.length})
              </h4>
              {data.visits.length === 0 ? (
                <p className="text-sm text-secondary-500 py-4 text-center">
                  No visits recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.visits.map((visit) => (
                    <div key={visit.id} className="card p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-secondary-900">
                          {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                        </span>
                        <span className="badge bg-secondary-50 text-secondary-600 border-secondary-200">
                          {visit.status}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-500 mt-1">
                        Doctor: {visit.doctor?.staff?.full_name ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
