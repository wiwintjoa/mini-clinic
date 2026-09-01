import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Eye, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { PatientFormModal } from './patients/PatientFormModal';
import { PatientDetailDrawer } from './patients/PatientDetailDrawer';
import { fetchPatients, PAGE_SIZE } from './patients/queries';
import type { Patient, PatientStatus } from '@/types';

const STATUS_STYLES: Record<PatientStatus, string> = {
  ACTIVE: 'bg-success-50 text-success-700 border-success-200',
  INACTIVE: 'bg-secondary-50 text-secondary-600 border-secondary-200',
};

export function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => fetchPatients({ search, page }),
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Patient Management"
        subtitle="Register and manage patient records"
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" />
            Register Patient
          </button>
        }
      />

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by MRN, name, NIK, or phone..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading && <LoadingState message="Loading patients..." />}
        {isError && <ErrorState message="Failed to load patients" />}
        {!isLoading && !isError && patients.length === 0 && (
          <EmptyState
            icon={Users}
            title="No patients found"
            message="Register a new patient or adjust your search to see results."
          />
        )}
        {!isLoading && !isError && patients.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 bg-secondary-50/50">
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">MRN</th>
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">Gender</th>
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">Insurance</th>
                    <th className="text-left px-4 py-3 font-semibold text-secondary-700">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                  {patients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-secondary-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-secondary-600">{patient.mrn}</td>
                      <td className="px-4 py-3 font-medium text-secondary-900">{patient.full_name}</td>
                      <td className="px-4 py-3 text-secondary-600">{patient.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-secondary-600">{patient.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-secondary-600">{patient.insurance ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_STYLES[patient.status]}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setSelectedPatientId(patient.id)}
                            className="btn-ghost p-1.5"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
              <p className="text-sm text-secondary-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary px-2 py-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-secondary-600">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary px-2 py-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <PatientFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <PatientDetailDrawer
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  );
}
