import type { Availability, RequestStatus } from '@/types';

const availabilityConfig: Record<Availability, { label: string; classes: string; dot: string }> = {
  available: { label: 'Available', classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  placed: { label: 'Placed', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  unavailable: { label: 'Unavailable', classes: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const requestStatusConfig: Record<RequestStatus, { label: string; classes: string; dot: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  approved: { label: 'Approved', classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  placed: { label: 'Placed', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

export function AvailabilityBadge({ status }: { status: Availability }) {
  const config = availabilityConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const config = requestStatusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
