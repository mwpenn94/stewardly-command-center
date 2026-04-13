import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  onClick?: () => void;
}

export default function MetricCard({ title, value, change, changeType = 'neutral', icon, onClick }: MetricCardProps) {
  return (
    <div
      className={`card flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="p-2.5 rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-muted truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-semibold text-text-primary mt-0.5">{value}</p>
        {change && (
          <p className={`text-xs mt-1 font-medium ${
            changeType === 'positive' ? 'text-accent-600' :
            changeType === 'negative' ? 'text-red-600' :
            'text-text-muted'
          }`}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
