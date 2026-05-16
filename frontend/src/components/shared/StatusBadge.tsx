const VARIANT_CLASSES: Record<string, string> = {
  done: 'bg-green-100 text-green-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  backlog: 'bg-gray-100 text-gray-600',
  blocked: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-yellow-100 text-yellow-800',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const classes =
    VARIANT_CLASSES[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {label ?? status}
    </span>
  );
}
