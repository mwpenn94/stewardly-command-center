interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantMap: Record<string, StatusBadgeProps['variant']> = {
  active: 'success',
  completed: 'success',
  converted: 'success',
  open: 'info',
  new: 'info',
  scheduled: 'info',
  configuring: 'info',
  in_progress: 'warning',
  contacted: 'warning',
  pending: 'warning',
  paused: 'warning',
  maintenance: 'warning',
  late: 'danger',
  urgent: 'danger',
  error: 'danger',
  lost: 'danger',
  cancelled: 'default',
  former: 'default',
  vacant: 'default',
  draft: 'default',
  qualified: 'info',
};

const variantClasses: Record<string, string> = {
  success: 'bg-accent-100 text-accent-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-primary-100 text-primary-800',
  default: 'bg-gray-100 text-gray-700',
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolved = variant ?? variantMap[status] ?? 'default';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${variantClasses[resolved]}`}>
      {label}
    </span>
  );
}
