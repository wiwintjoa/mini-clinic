import { Link } from 'react-router-dom';
import { PhoneCall, Stethoscope, Check, Clock } from 'lucide-react';
import type { QueueStatus } from '@/types';

interface QueueRow {
  id: string;
  queue_number: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  status: QueueStatus;
  created_at: string;
  updated_at: string;
  patient?: { full_name: string; mrn: string } | null;
}

interface QueueEntryRowProps {
  entry: QueueRow;
  waitMinutes: number;
  statusColor: string;
  isCalling: boolean;
  isStarting: boolean;
  isCompleting: boolean;
  onCall: () => void;
  onStart: () => void;
  onComplete: () => void;
  activeVisit: boolean;
}

export function QueueEntryRow({
  entry,
  waitMinutes,
  statusColor,
  isCalling,
  isStarting,
  isCompleting,
  onCall,
  onStart,
  onComplete,
  activeVisit,
}: QueueEntryRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary-100 text-secondary-700 font-semibold">
          {entry.queue_number}
        </div>
        <div>
          <p className="text-sm font-semibold text-secondary-900">{entry.patient?.full_name ?? 'Unknown'}</p>
          <div className="flex items-center gap-2 text-xs text-secondary-500">
            <span>{entry.patient?.mrn ?? '--'}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {waitMinutes}m
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`badge ${statusColor}`}>{entry.status.replace('_', ' ')}</span>

        {entry.status === 'WAITING' && (
          <button className="btn-secondary text-xs" onClick={onCall} disabled={isCalling}>
            <PhoneCall className="w-3.5 h-3.5" />
            {isCalling ? 'Calling...' : 'Call'}
          </button>
        )}

        {entry.status === 'CALLED' && (
          <button className="btn-primary text-xs" onClick={onStart} disabled={isStarting}>
            <Stethoscope className="w-3.5 h-3.5" />
            {isStarting ? 'Starting...' : 'Start Consultation'}
          </button>
        )}

        {entry.status === 'IN_CONSULTATION' && (
          <>
            {activeVisit && (
              <Link
                to={`/doctor/consultation/${entry.id}`}
                className="btn-secondary text-xs"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Open Consultation
              </Link>
            )}
            <button className="btn-primary text-xs" onClick={onComplete} disabled={isCompleting}>
              <Check className="w-3.5 h-3.5" />
              {isCompleting ? 'Completing...' : 'Complete'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
