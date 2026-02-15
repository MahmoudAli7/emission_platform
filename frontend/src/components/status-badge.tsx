'use client';

interface StatusBadgeProps {
  status: 'Within Limit' | 'Limit Exceeded';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const isWithinLimit = status === 'Within Limit';

  const baseClasses =
    'inline-flex items-center font-semibold rounded-full border';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const colorClasses = isWithinLimit
    ? 'border-green-300 bg-green-50 text-green-800'
    : 'border-red-300 bg-red-50 text-red-800';

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${colorClasses}`}>
      <span
        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
          isWithinLimit ? 'bg-green-600' : 'bg-red-600'
        }`}
      />
      {status}
    </span>
  );
}
