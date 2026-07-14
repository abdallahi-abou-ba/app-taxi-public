import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  PauseCircle,
  Wrench,
  AlertCircle,
  Archive,
  Lock,
  MinusCircle,
  CalendarClock,
  ThumbsUp,
  MapPin,
  PlayCircle,
} from 'lucide-react';

// One icon per status string, shared across every entity (driver approval,
// vehicle, ride, settlement, complaint) that renders a StatusBadge - see
// index.css's status-* classes for the matching color per status.
const ICONS = {
  PENDING: Clock,
  REQUESTED: Clock,
  APPROVED: CheckCircle2,
  ACTIVE: CheckCircle2,
  PAID: CheckCircle2,
  CONFIRMED: CheckCircle2,
  RESOLVED: CheckCircle2,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: XCircle,
  BLOCKED: Ban,
  SUSPENDED: PauseCircle,
  MAINTENANCE: Wrench,
  OPEN: AlertCircle,
  ARCHIVED: Archive,
  CLOSED: Lock,
  UNAVAILABLE: MinusCircle,
  SCHEDULED: CalendarClock,
  ACCEPTED: ThumbsUp,
  ARRIVED: MapPin,
  IN_PROGRESS: PlayCircle,
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const Icon = ICONS[status];
  return (
    <span className={`status-badge status-${status}`}>
      {Icon && <Icon size={11} strokeWidth={2.75} />}
      {status}
    </span>
  );
}
